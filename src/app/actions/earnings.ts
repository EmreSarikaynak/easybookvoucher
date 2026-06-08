"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { resolveCatalogDisplayPrice } from "@/lib/tour-catalog-data";
import {
  loadExchangeRatePairsForCalculation,
  resolveAgencyAmountInCurrency,
  resolveTourBaseInCurrency,
} from "@/lib/exchange-rates";
import { computeEurRate } from "@/lib/eur-snapshot";
import {
  computeVoucherEarnings,
  resolvePerPaxCost,
  round2,
} from "@/lib/pricing";
import type { CurrencyType } from "@/lib/types";

export interface VoucherEarningRow {
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  tour_name: string;
  agency_id: string | null;
  agency_code: string | null;
  agency_name: string | null;
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  currency: string;
  total_price: number;
  deposit_paid: number;
  /** EUR snapshot (voucher kaydedildiği gün kilitlenmiş). */
  total_price_eur: number | null;
  deposit_paid_eur: number | null;
  easybook_cost_eur: number | null;
  eur_rate_snapshot: number | null;
  /** EasyBook'a borç (maliyet). missing_cost ise anlamlı değildir. */
  easybook_cost: number;
  /** Acentenin liste satış fiyatı toplamı. */
  list_price: number;
  /** Standart marj = liste fiyatı − maliyet. */
  standard_margin: number;
  /** Bilete yazılan ekstra fark (upsell) = bilet fiyatı − liste fiyatı. */
  extra_markup: number;
  /** Toplam kazanç = bilet fiyatı − maliyet. */
  total_profit: number;
  /** EUR cinsinden toplam kazanç (snapshot ile). */
  total_profit_eur: number | null;
  /** Maliyet hesaplanamıyor (taban fiyat yok / USD-GBP / tur yok). */
  missing_cost: boolean;
  source: string;
}

export interface CurrencyTotals {
  total_sales: number;
  easybook_debt: number;
  collected_deposit: number;
  standard_margin: number;
  extra_markup: number;
  total_profit: number;
  /** Maliyeti bilinmediği için toplamlara katılmayan bilet sayısı. */
  missing_cost_count: number;
}

/** Konsolide EUR özeti — birincil görünüm. */
export interface EurAggregateTotals {
  total_sales_eur: number;
  easybook_debt_eur: number;
  collected_deposit_eur: number;
  total_profit_eur: number;
  voucher_count_with_eur: number;
  voucher_count_missing_eur: number;
}

export interface AgencySummary {
  agency_id: string;
  agency_code: string | null;
  agency_name: string;
  voucher_count: number;
  total_pax_adult: number;
  total_pax_child: number;
  totals_by_currency: Record<string, CurrencyTotals>;
  /** Birincil görünüm: konsolide EUR. */
  eur: EurAggregateTotals;
}

function emptyEurAggregate(): EurAggregateTotals {
  return {
    total_sales_eur: 0,
    easybook_debt_eur: 0,
    collected_deposit_eur: 0,
    total_profit_eur: 0,
    voucher_count_with_eur: 0,
    voucher_count_missing_eur: 0,
  };
}

export interface EarningsReport {
  rows: VoucherEarningRow[];
  agencySummaries: AgencySummary[];
  filterAgencyId: string | null;
  isAdminView: boolean;
  startDate: string;
  endDate: string;
}

interface FetchEarningsParams {
  startDate: string;
  endDate: string;
  agencyId?: string | null;
}

/**
 * Acente kazanç + EasyBook borç raporunu üretir.
 * - Acente kullanıcı: yalnızca kendi acentesinin verileri.
 * - Admin: agencyId param'ı verilirse o acente, verilmezse tüm acenteler.
 *
 * Maliyet kaynağı: agency_tour_prices (acente bazlı cost_adult/cost_child).
 * Eksik kayıt varsa o voucher için maliyet 0 sayılır (uyarı amaçlı).
 */
export async function fetchEarningsReport(
  params: FetchEarningsParams
): Promise<{ data: EarningsReport | null; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile) {
    return { data: null, error: "Oturum açmanız gerekiyor" };
  }
  const supabase = await createServerSupabaseClient();

  const adminView = isAdmin(profile);
  const filterAgencyId = adminView
    ? params.agencyId ?? null
    : profile.agency_id ?? null;

  if (!adminView && !filterAgencyId) {
    return { data: null, error: "Acente kaydı bulunamadı" };
  }

  let query = supabase
    .from("vouchers")
    .select(
      `id, voucher_no, tour_date, tour_id, agency_id, pax_adult, pax_child, pax_infant,
       currency, total_price, deposit_paid,
       total_price_eur, deposit_paid_eur, easybook_cost_eur, eur_rate_snapshot, eur_rate_date,
       source, status,
       tour:tours(name),
       agency:agencies(name, agency_code)`
    )
    .gte("tour_date", params.startDate)
    .lte("tour_date", params.endDate)
    .eq("status", "active");

  if (filterAgencyId) {
    query = query.eq("agency_id", filterAgencyId);
  }

  const { data: vouchers, error: vErr } = await query;
  if (vErr) {
    return { data: null, error: vErr.message };
  }

  const tourIds = Array.from(new Set((vouchers ?? []).map((v) => v.tour_id).filter(Boolean))) as string[];
  const agencyIds = Array.from(
    new Set((vouchers ?? []).map((v) => v.agency_id).filter(Boolean))
  ) as string[];

  const safeTourIds =
    tourIds.length > 0 ? tourIds : ["00000000-0000-0000-0000-000000000000"];

  const { data: priceRows } = await supabase
    .from("agency_tour_prices")
    .select(
      "agency_id, tour_id, currency, cost_adult, cost_child, price_adult, price_child"
    )
    .in("tour_id", safeTourIds)
    .in(
      "agency_id",
      agencyIds.length > 0 ? agencyIds : ["00000000-0000-0000-0000-000000000000"]
    );

  // Acente bazlı override maliyeti + acentenin liste satış fiyatı.
  const priceMap = new Map<
    string,
    {
      cost_adult: number | null;
      cost_child: number | null;
      price_adult: number | null;
      price_child: number | null;
    }
  >();
  (priceRows ?? []).forEach((r) => {
    const key = `${r.agency_id}__${r.tour_id}__${(r.currency ?? "EUR").toUpperCase()}`;
    priceMap.set(key, {
      cost_adult: r.cost_adult ?? null,
      cost_child: r.cost_child ?? null,
      price_adult: r.price_adult ?? null,
      price_child: r.price_child ?? null,
    });
  });

  // EasyBook taban maliyetleri (override yoksa fallback) — currency duyarlı.
  const [{ data: tourRows }, { pairs: ratePairs }] = await Promise.all([
    supabase
      .from("tours")
      .select(
        "id, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try, price_per_booking"
      )
      .in("id", safeTourIds),
    loadExchangeRatePairsForCalculation(),
  ]);

  const baseMap = new Map<
    string,
    {
      adult_eur: number | null;
      child_eur: number | null;
      adult_try: number | null;
      child_try: number | null;
      price_per_booking: boolean;
    }
  >();
  (tourRows ?? []).forEach((t) => {
    baseMap.set(t.id, {
      adult_eur: t.base_price_adult_eur ?? null,
      child_eur: t.base_price_child_eur ?? null,
      adult_try: t.base_price_adult_try ?? null,
      child_try: t.base_price_child_try ?? null,
      price_per_booking: t.price_per_booking ?? false,
    });
  });

  const rows: VoucherEarningRow[] = [];
  const summaryMap = new Map<string, AgencySummary>();

  for (const v of vouchers ?? []) {
    const currency = (v.currency || "EUR").toUpperCase();
    const tourId = v.tour_id ?? "";
    const agencyId = v.agency_id ?? "";
    const paxAdult = v.pax_adult ?? 0;
    const paxChild = v.pax_child ?? 0;
    const totalPrice = v.total_price ?? 0;
    const deposit = v.deposit_paid ?? 0;
    const totalPriceEur =
      v.total_price_eur != null ? Number(v.total_price_eur) : null;
    const depositEur =
      v.deposit_paid_eur != null ? Number(v.deposit_paid_eur) : null;
    const easybookCostEur =
      v.easybook_cost_eur != null ? Number(v.easybook_cost_eur) : null;
    const eurRate =
      v.eur_rate_snapshot != null ? Number(v.eur_rate_snapshot) : null;

    const cur = currency as CurrencyType;
    const prices = priceMap.get(`${agencyId}__${tourId}__${currency}`);
    const pricesEur = priceMap.get(`${agencyId}__${tourId}__EUR`);
    const base = baseMap.get(tourId);

    const tourBase = resolveTourBaseInCurrency(
      cur,
      base?.adult_eur,
      base?.child_eur,
      base?.adult_try,
      base?.child_try,
      ratePairs
    );

    const agencyCost = resolveAgencyAmountInCurrency(
      cur,
      prices?.cost_adult,
      prices?.cost_child,
      pricesEur?.cost_adult,
      pricesEur?.cost_child,
      ratePairs
    );

    const cost = resolvePerPaxCost(
      agencyCost.adult,
      agencyCost.child,
      tourBase.adult,
      tourBase.child
    );

    const agencyList = resolveAgencyAmountInCurrency(
      cur,
      prices?.price_adult,
      prices?.price_child,
      pricesEur?.price_adult,
      pricesEur?.price_child,
      ratePairs
    );

    const list = resolveCatalogDisplayPrice(
      agencyList.adult,
      agencyList.child,
      tourBase.adult,
      tourBase.child
    );

    const earnings = computeVoucherEarnings({
      paxAdult,
      paxChild,
      totalPrice,
      cost,
      listAdult: list.price_adult,
      listChild: list.price_child,
      pricePerBooking: base?.price_per_booking ?? false,
    });

    // Tur yoksa maliyet de bilinemez.
    const missingCost = earnings.missing_cost || !tourId;

    const agencyRow = (v.agency && !Array.isArray(v.agency) ? v.agency : null) as {
      name?: string | null;
      agency_code?: string | null;
    } | null;
    const tourRow = (v.tour && !Array.isArray(v.tour) ? v.tour : null) as {
      name?: string | null;
    } | null;

    // Voucher EUR snapshot — yoksa rapor zamanı kurları ile fallback
    const fbRate = computeEurRate(currency as CurrencyType, ratePairs);
    const profitEur =
      !missingCost && eurRate != null
        ? round2(earnings.total_profit * eurRate)
        : !missingCost && fbRate != null
          ? round2(earnings.total_profit * fbRate)
          : null;

    rows.push({
      voucher_id: v.id,
      voucher_no: v.voucher_no,
      voucher_date: v.tour_date,
      tour_name: tourRow?.name ?? "—",
      agency_id: agencyId || null,
      agency_code: agencyRow?.agency_code ?? null,
      agency_name: agencyRow?.name ?? null,
      pax_adult: paxAdult,
      pax_child: paxChild,
      pax_infant: v.pax_infant ?? 0,
      currency,
      total_price: round2(totalPrice),
      deposit_paid: round2(deposit),
      total_price_eur: totalPriceEur,
      deposit_paid_eur: depositEur,
      easybook_cost_eur: easybookCostEur,
      eur_rate_snapshot: eurRate,
      easybook_cost: earnings.easybook_cost,
      list_price: earnings.list_price,
      standard_margin: earnings.standard_margin,
      extra_markup: earnings.extra_markup,
      total_profit: earnings.total_profit,
      total_profit_eur: profitEur,
      missing_cost: missingCost,
      source: v.source ?? "manual",
    });

    if (!agencyId) continue;
    if (!summaryMap.has(agencyId)) {
      summaryMap.set(agencyId, {
        agency_id: agencyId,
        agency_code: agencyRow?.agency_code ?? null,
        agency_name: agencyRow?.name ?? "—",
        voucher_count: 0,
        total_pax_adult: 0,
        total_pax_child: 0,
        totals_by_currency: {},
        eur: emptyEurAggregate(),
      });
    }
    const sum = summaryMap.get(agencyId)!;
    sum.voucher_count += 1;
    sum.total_pax_adult += paxAdult;
    sum.total_pax_child += paxChild;

    // EUR aggregation
    const useRate = eurRate ?? fbRate;
    if (useRate != null) {
      const salesEur = totalPriceEur ?? round2(totalPrice * useRate);
      const depEur = depositEur ?? round2(deposit * useRate);
      sum.eur.total_sales_eur = round2(sum.eur.total_sales_eur + salesEur);
      sum.eur.collected_deposit_eur = round2(
        sum.eur.collected_deposit_eur + depEur
      );
      if (!missingCost) {
        const debtEur =
          easybookCostEur ?? round2(earnings.easybook_cost * useRate);
        sum.eur.easybook_debt_eur = round2(
          sum.eur.easybook_debt_eur + debtEur
        );
        const pEur = profitEur ?? round2(earnings.total_profit * useRate);
        sum.eur.total_profit_eur = round2(
          sum.eur.total_profit_eur + pEur
        );
        sum.eur.voucher_count_with_eur += 1;
      } else {
        sum.eur.voucher_count_missing_eur += 1;
      }
    } else {
      sum.eur.voucher_count_missing_eur += 1;
    }
    if (!sum.totals_by_currency[currency]) {
      sum.totals_by_currency[currency] = {
        total_sales: 0,
        easybook_debt: 0,
        collected_deposit: 0,
        standard_margin: 0,
        extra_markup: 0,
        total_profit: 0,
        missing_cost_count: 0,
      };
    }
    const c = sum.totals_by_currency[currency];
    // Satış ve tahsilat her zaman sayılır; maliyet/kazanç yalnız maliyet biliniyorsa.
    c.total_sales = round2(c.total_sales + totalPrice);
    c.collected_deposit = round2(c.collected_deposit + deposit);
    if (missingCost) {
      c.missing_cost_count += 1;
    } else {
      c.easybook_debt = round2(c.easybook_debt + earnings.easybook_cost);
      c.standard_margin = round2(c.standard_margin + earnings.standard_margin);
      c.extra_markup = round2(c.extra_markup + earnings.extra_markup);
      c.total_profit = round2(c.total_profit + earnings.total_profit);
    }
  }

  return {
    data: {
      rows: rows.sort((a, b) => b.voucher_date.localeCompare(a.voucher_date)),
      agencySummaries: Array.from(summaryMap.values()).sort((a, b) =>
        (a.agency_code ?? "").localeCompare(b.agency_code ?? "")
      ),
      filterAgencyId,
      isAdminView: adminView,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  };
}
