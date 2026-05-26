"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { resolveCatalogDisplayPrice } from "@/lib/tour-catalog-data";
import {
  computeVoucherEarnings,
  resolvePerPaxCost,
  round2,
} from "@/lib/pricing";

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

export interface AgencySummary {
  agency_id: string;
  agency_code: string | null;
  agency_name: string;
  voucher_count: number;
  total_pax_adult: number;
  total_pax_child: number;
  totals_by_currency: Record<string, CurrencyTotals>;
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
       currency, total_price, deposit_paid, source, status,
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
  const { data: tourRows } = await supabase
    .from("tours")
    .select(
      "id, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try"
    )
    .in("id", safeTourIds);

  const baseMap = new Map<
    string,
    {
      adult_eur: number | null;
      child_eur: number | null;
      adult_try: number | null;
      child_try: number | null;
    }
  >();
  (tourRows ?? []).forEach((t) => {
    baseMap.set(t.id, {
      adult_eur: t.base_price_adult_eur ?? null,
      child_eur: t.base_price_child_eur ?? null,
      adult_try: t.base_price_adult_try ?? null,
      child_try: t.base_price_child_try ?? null,
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

    const prices = priceMap.get(`${agencyId}__${tourId}__${currency}`);
    const base = baseMap.get(tourId);

    // Currency duyarlı taban fiyat: EUR/TRY var, USD/GBP için yok (=> maliyet bilinmiyor).
    const baseAdult =
      currency === "EUR"
        ? base?.adult_eur
        : currency === "TRY"
          ? base?.adult_try
          : null;
    const baseChild =
      currency === "EUR"
        ? base?.child_eur
        : currency === "TRY"
          ? base?.child_try
          : null;

    const cost = resolvePerPaxCost(
      prices?.cost_adult,
      prices?.cost_child,
      baseAdult,
      baseChild
    );

    // Liste satış fiyatı: acentenin kayıtlı fiyatı, yoksa tabana düş.
    const list = resolveCatalogDisplayPrice(
      prices?.price_adult,
      prices?.price_child,
      baseAdult,
      baseChild
    );

    const earnings = computeVoucherEarnings({
      paxAdult,
      paxChild,
      totalPrice,
      cost,
      listAdult: list.price_adult,
      listChild: list.price_child,
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
      easybook_cost: earnings.easybook_cost,
      list_price: earnings.list_price,
      standard_margin: earnings.standard_margin,
      extra_markup: earnings.extra_markup,
      total_profit: earnings.total_profit,
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
      });
    }
    const sum = summaryMap.get(agencyId)!;
    sum.voucher_count += 1;
    sum.total_pax_adult += paxAdult;
    sum.total_pax_child += paxChild;
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
