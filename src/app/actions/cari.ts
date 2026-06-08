"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import {
  computeVoucherEarnings,
  resolvePerPaxCost,
  round2,
} from "@/lib/pricing";
import {
  loadExchangeRatePairsForCalculation,
  resolveAgencyAmountInCurrency,
  resolveTourBaseInCurrency,
  type RatePair,
} from "@/lib/exchange-rates";
import { resolveCatalogDisplayPrice } from "@/lib/tour-catalog-data";
import { snapshotToEur, computeEurRate } from "@/lib/eur-snapshot";
import type { CurrencyType } from "@/lib/types";

const SUPPORTED_CURRENCIES = ["EUR", "TRY", "USD", "GBP"] as const;
type Cur = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Tek bir acente + para birimi için bakiye.
 *
 * Hesaplama mantığı (kullanıcı modeli — basit hali):
 *  - EasyBook'un alacağı = aktif biletlerin maliyet toplamı (cost_total).
 *  - Acentenin müşteriden ne aldığı bizi ilgilendirmez; acente bize ne zaman ne öderse
 *    onu düşeriz (payments_total).
 *
 * Net Bakiye = cost_total − payments_total
 *  (+) → acente EasyBook'a borçlu
 *  (−) → EasyBook acenteye borçlu (fazla ödeme alındıysa)
 */
export interface CariCurrencyLine {
  currency: Cur;
  cost_total: number;      // aktif biletlerin EasyBook maliyet toplamı (alacak)
  sales_total: number;     // aktif biletlerin toplam satış tutarı (müşteriye kesilen)
  payments_total: number;  // acentenin EasyBook'a yaptığı ödemeler
  net_debt: number;        // cost − payments
  agency_profit: number;   // sales_total − cost_total (acentenin karı)
  voucher_count: number;
  missing_cost_count: number;
}

/**
 * Tek konsolide EUR bakiyesi. Cari hesap EUR cinsinden tutulduğu için
 * UI'da bu özet birincil — per-currency `lines` sadece referans.
 *
 * Tutarlar voucher / agent_payments tablolarındaki *_eur snapshot
 * kolonlarından gelir; snapshot yoksa o satır voucher_count_missing_eur'a
 * sayılır ve cost_total_eur'a katkı vermez (drift'i önlemek için).
 */
export interface CariEurSummary {
  cost_total_eur: number;        // Σ easybook_cost_eur (aktif biletler)
  sales_total_eur: number;       // Σ total_price_eur (aktif biletlerin satış toplamı)
  payments_total_eur: number;    // Σ payment_amount_eur
  net_debt_eur: number;          // cost − payments
  agency_profit_eur: number;     // sales_total_eur − cost_total_eur (acentenin karı)
  voucher_count: number;         // EUR snapshot'lı aktif voucher sayısı
  voucher_count_missing_eur: number; // EUR snapshot yoksa veya cost null
  payment_count_missing_eur: number;
}

export interface CariAgencyCardData {
  agency_id: string;
  agency_code: string | null;
  agency_name: string;
  is_active: boolean;
  voucher_count_active: number;
  voucher_count_cancelled: number;
  last_activity: string | null; // ISO date
  /** EUR cinsinden konsolide bakiye (birincil). */
  eur: CariEurSummary;
  /** Per-currency satırlar — referans amaçlı, UI'da gizlenebilir. */
  lines: CariCurrencyLine[];
}

export interface CariVoucherRow {
  voucher_id: string;
  voucher_no: string;
  tour_date: string;
  customer_name: string;
  tour_name: string;
  status: "active" | "cancelled" | "completed";
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  currency: Cur;
  /** EasyBook'un bu biletten alacağı (voucher currency cinsinden). */
  easybook_cost: number;
  /** Aynı maliyetin EUR snapshot karşılığı. NULL = snapshot yok (eski voucher). */
  easybook_cost_eur: number | null;
  /** Acentenin müşteriye kesen satış fiyatı (voucher currency cinsinden). */
  total_price: number;
  /** Satış fiyatının EUR snapshot karşılığı. */
  total_price_eur: number | null;
  /** Voucher EUR kur snapshot'ı (1 birim currency = X EUR). */
  eur_rate_snapshot: number | null;
  eur_rate_date: string | null;
  missing_cost: boolean;
  source: string;
  created_at: string;
}

export interface CariAgentPaymentRow {
  id: string;
  amount: number;
  currency: Cur;
  /** EUR snapshot karşılığı. NULL = snapshot yok. */
  amount_eur: number | null;
  eur_rate_snapshot: number | null;
  eur_rate_date: string | null;
  payment_date: string;
  notes: string | null;
  related_voucher_no: string | null;
  created_at: string;
}

export interface CariAgencyDetail {
  agency_id: string;
  agency_code: string | null;
  agency_name: string;
  is_active: boolean;
  /** Birincil görünüm: konsolide EUR bakiye. */
  eur: CariEurSummary;
  /** Referans — per-currency. */
  lines: CariCurrencyLine[];
  active_vouchers: CariVoucherRow[];
  cancelled_vouchers: CariVoucherRow[];
  payments: CariAgentPaymentRow[];
}

function emptyEurSummary(): CariEurSummary {
  return {
    cost_total_eur: 0,
    sales_total_eur: 0,
    payments_total_eur: 0,
    net_debt_eur: 0,
    agency_profit_eur: 0,
    voucher_count: 0,
    voucher_count_missing_eur: 0,
    payment_count_missing_eur: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function emptyLine(c: Cur): CariCurrencyLine {
  return {
    currency: c,
    cost_total: 0,
    sales_total: 0,
    payments_total: 0,
    net_debt: 0,
    agency_profit: 0,
    voucher_count: 0,
    missing_cost_count: 0,
  };
}

function isSupportedCurrency(x: string | null | undefined): x is Cur {
  return !!x && (SUPPORTED_CURRENCIES as readonly string[]).includes(x);
}

interface VoucherRowFromDb {
  id: string;
  voucher_no: string;
  tour_date: string;
  customer_name: string | null;
  tour_id: string | null;
  agency_id: string | null;
  pax_adult: number | null;
  pax_child: number | null;
  pax_infant: number | null;
  currency: string;
  total_price: number | null;
  deposit_paid: number | null;
  total_price_eur: number | null;
  deposit_paid_eur: number | null;
  easybook_cost_eur: number | null;
  eur_rate_snapshot: number | null;
  eur_rate_date: string | null;
  source?: string | null;
  status: "active" | "cancelled" | "completed";
  created_at: string;
  tour?: { name?: string | null } | { name?: string | null }[] | null;
}

interface PriceRow {
  agency_id: string;
  tour_id: string;
  currency: string;
  cost_adult: number | null;
  cost_child: number | null;
  price_adult: number | null;
  price_child: number | null;
}

interface BaseRow {
  id: string;
  base_price_adult_eur: number | null;
  base_price_child_eur: number | null;
  base_price_adult_try: number | null;
  base_price_child_try: number | null;
  price_per_booking: boolean | null;
}

interface PaymentRow {
  id: string;
  agent_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_amount_eur: number | null;
  eur_rate_snapshot: number | null;
  eur_rate_date: string | null;
  payment_date: string;
  notes: string | null;
  related_voucher_id: string | null;
  created_at: string;
  related_voucher?: { voucher_no?: string | null } | null;
}

function computeRow(
  v: VoucherRowFromDb,
  priceMap: Map<string, PriceRow>,
  baseMap: Map<string, BaseRow>,
  ratePairs: RatePair[]
): CariVoucherRow {
  const currency = (v.currency || "EUR").toUpperCase();
  const cur: Cur = isSupportedCurrency(currency) ? currency : "EUR";
  const tourId = v.tour_id ?? "";
  const agencyId = v.agency_id ?? "";
  const paxAdult = v.pax_adult ?? 0;
  const paxChild = v.pax_child ?? 0;

  const prices = priceMap.get(`${agencyId}__${tourId}__${cur}`);
  const pricesEur = priceMap.get(`${agencyId}__${tourId}__EUR`);
  const base = baseMap.get(tourId);

  const tourBase = resolveTourBaseInCurrency(
    cur,
    base?.base_price_adult_eur,
    base?.base_price_child_eur,
    base?.base_price_adult_try,
    base?.base_price_child_try,
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
    totalPrice: v.total_price ?? 0,
    cost,
    listAdult: list.price_adult,
    listChild: list.price_child,
    pricePerBooking: base?.price_per_booking ?? false,
  });

  const tourRow = (v.tour && !Array.isArray(v.tour) ? v.tour : null) as
    | { name?: string | null }
    | null;

  // EUR snapshot: DB'den geliyorsa onu kullan; yoksa compute zamanında
  // çevirilecek (cari aggregation'da fallback olarak)
  const eurRate =
    v.eur_rate_snapshot != null ? Number(v.eur_rate_snapshot) : null;
  const easybookCostEurFromDb =
    v.easybook_cost_eur != null ? Number(v.easybook_cost_eur) : null;

  return {
    voucher_id: v.id,
    voucher_no: v.voucher_no,
    tour_date: v.tour_date,
    customer_name: v.customer_name ?? "—",
    tour_name: tourRow?.name ?? "—",
    status: v.status,
    pax_adult: paxAdult,
    pax_child: paxChild,
    pax_infant: v.pax_infant ?? 0,
    currency: cur,
    easybook_cost: earnings.easybook_cost,
    easybook_cost_eur: easybookCostEurFromDb,
    total_price: v.total_price ?? 0,
    total_price_eur: v.total_price_eur != null ? Number(v.total_price_eur) : null,
    eur_rate_snapshot: eurRate,
    eur_rate_date: v.eur_rate_date ?? null,
    missing_cost: earnings.missing_cost || !tourId,
    source: v.source ?? "manual",
    created_at: v.created_at,
  };
}

/** İlgili tur/maliyet kayıtlarını toplu çek. */
async function loadPricingMaps(
  supabase: SupabaseClient,
  tourIds: string[],
  agencyIds: string[]
) {
  const safeTourIds = tourIds.length ? tourIds : ["00000000-0000-0000-0000-000000000000"];
  const safeAgencyIds = agencyIds.length ? agencyIds : ["00000000-0000-0000-0000-000000000000"];

  const [{ data: priceRows }, { data: tourRows }] = await Promise.all([
    supabase
      .from("agency_tour_prices")
      .select("agency_id, tour_id, currency, cost_adult, cost_child, price_adult, price_child")
      .in("tour_id", safeTourIds)
      .in("agency_id", safeAgencyIds),
    supabase
      .from("tours")
      .select(
        "id, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try, price_per_booking"
      )
      .in("id", safeTourIds),
  ]);

  const priceMap = new Map<string, PriceRow>();
  (priceRows ?? []).forEach((r: PriceRow) => {
    const key = `${r.agency_id}__${r.tour_id}__${(r.currency ?? "EUR").toUpperCase()}`;
    priceMap.set(key, r);
  });

  const baseMap = new Map<string, BaseRow>();
  (tourRows ?? []).forEach((t: BaseRow) => {
    baseMap.set(t.id, t);
  });

  return { priceMap, baseMap };
}

/* ------------------------------------------------------------------ */
/* Public: admin landing                                               */
/* ------------------------------------------------------------------ */

export async function fetchCariOverview(): Promise<{
  data: CariAgencyCardData[] | null;
  error?: string;
}> {
  const profile = await getCurrentUser();
  if (!profile) return { data: null, error: "Oturum açmanız gerekiyor" };
  if (!isAdmin(profile)) return { data: null, error: "Yetki yok" };

  // Yetki kontrolü yukarıda yapıldı; veriyi RLS bypass ile çekiyoruz ki
  // admin görünümü tüm acenteler için tutarlı olsun.
  let supabase: SupabaseClient;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return {
      data: null,
      error:
        "Sunucu yapılandırma hatası: SUPABASE_SERVICE_ROLE_KEY tanımlı değil. " +
        (e instanceof Error ? e.message : ""),
    };
  }

  const [{ data: agencies, error: aErr }, { data: vouchers, error: vErr }, { data: payments, error: pErr }] =
    await Promise.all([
      supabase
        .from("agencies")
        .select("id, agency_code, name, is_active")
        .order("agency_code", { ascending: true }),
      supabase
        .from("vouchers")
        .select(
          "id, voucher_no, tour_date, customer_name, tour_id, agency_id, pax_adult, pax_child, pax_infant, currency, total_price, deposit_paid, total_price_eur, deposit_paid_eur, easybook_cost_eur, eur_rate_snapshot, eur_rate_date, source, status, created_at, tour:tours(name)"
        ),
      supabase
        .from("agent_payments")
        .select("id, agent_id, payment_amount, payment_currency, payment_amount_eur, eur_rate_snapshot, eur_rate_date, payment_date, notes, related_voucher_id, created_at"),
    ]);

  if (aErr) return { data: null, error: aErr.message };
  if (vErr) return { data: null, error: vErr.message };
  if (pErr) return { data: null, error: pErr.message };

  const tourIds = Array.from(
    new Set((vouchers ?? []).map((v) => v.tour_id).filter(Boolean))
  ) as string[];
  const agencyIds = Array.from(
    new Set((vouchers ?? []).map((v) => v.agency_id).filter(Boolean))
  ) as string[];

  const [{ priceMap, baseMap }, { pairs: ratePairs }] = await Promise.all([
    loadPricingMaps(supabase, tourIds, agencyIds),
    loadExchangeRatePairsForCalculation(),
  ]);

  const cardsMap = new Map<string, CariAgencyCardData>();
  const eurMap = new Map<string, CariEurSummary>();
  for (const a of agencies ?? []) {
    cardsMap.set(a.id, {
      agency_id: a.id,
      agency_code: a.agency_code ?? null,
      agency_name: a.name,
      is_active: a.is_active ?? true,
      voucher_count_active: 0,
      voucher_count_cancelled: 0,
      last_activity: null,
      eur: emptyEurSummary(),
      lines: [],
    });
    eurMap.set(a.id, emptyEurSummary());
  }

  // EUR snapshot olmayan satırlar için fallback: rapor zamanı kurları ile çevir.
  const fallbackEurRate = (currency: Cur): number | null =>
    computeEurRate(currency, ratePairs);

  const lineMap = new Map<string, Map<Cur, CariCurrencyLine>>();
  function lineFor(agencyId: string, c: Cur): CariCurrencyLine {
    let sub = lineMap.get(agencyId);
    if (!sub) {
      sub = new Map();
      lineMap.set(agencyId, sub);
    }
    let line = sub.get(c);
    if (!line) {
      line = emptyLine(c);
      sub.set(c, line);
    }
    return line;
  }

  for (const v of (vouchers as VoucherRowFromDb[]) ?? []) {
    const agencyId = v.agency_id;
    if (!agencyId) continue;
    const card = cardsMap.get(agencyId);
    if (!card) continue;

    if (v.status === "cancelled") {
      card.voucher_count_cancelled += 1;
      continue;
    }
    // active + completed (gerçekleşmiş turlar) — ikisi de EasyBook alacağına
    // katkı sağlar. Sadece "cancelled" cariden düşülür.
    card.voucher_count_active += 1;
    const isoCreatedAt = v.created_at;
    if (!card.last_activity || isoCreatedAt > card.last_activity) {
      card.last_activity = isoCreatedAt;
    }

    const row = computeRow(v, priceMap, baseMap, ratePairs);
    const line = lineFor(agencyId, row.currency);
    line.voucher_count += 1;
    line.sales_total = round2(line.sales_total + row.total_price);
    if (row.missing_cost) {
      line.missing_cost_count += 1;
    } else {
      line.cost_total = round2(line.cost_total + row.easybook_cost);
    }

    // EUR aggregation — birincil görünüm
    const eurSummary = eurMap.get(agencyId);
    if (eurSummary) {
      // Satış EUR toplamı
      let salesEur: number | null = row.total_price_eur;
      if (salesEur == null) {
        const fb = fallbackEurRate(row.currency);
        if (fb != null) salesEur = round2(row.total_price * fb);
      }
      if (salesEur != null) {
        eurSummary.sales_total_eur = round2(eurSummary.sales_total_eur + salesEur);
      }

      let costEur: number | null = row.easybook_cost_eur;
      if (costEur == null && !row.missing_cost) {
        const fb = fallbackEurRate(row.currency);
        if (fb != null) costEur = round2(row.easybook_cost * fb);
      }
      if (costEur != null && !row.missing_cost) {
        eurSummary.cost_total_eur = round2(eurSummary.cost_total_eur + costEur);
        eurSummary.voucher_count += 1;
      } else {
        eurSummary.voucher_count_missing_eur += 1;
      }
    }
  }

  for (const p of (payments as PaymentRow[]) ?? []) {
    const c = (p.payment_currency ?? "EUR").toUpperCase();
    if (!isSupportedCurrency(c)) continue;
    const line = lineFor(p.agent_id, c);
    line.payments_total = round2(line.payments_total + (p.payment_amount ?? 0));

    const eurSummary = eurMap.get(p.agent_id);
    if (eurSummary) {
      let amountEur: number | null =
        p.payment_amount_eur != null ? Number(p.payment_amount_eur) : null;
      if (amountEur == null) {
        const fb = fallbackEurRate(c);
        if (fb != null) amountEur = round2((p.payment_amount ?? 0) * fb);
      }
      if (amountEur != null) {
        eurSummary.payments_total_eur = round2(
          eurSummary.payments_total_eur + amountEur
        );
      } else {
        eurSummary.payment_count_missing_eur += 1;
      }
    }
  }

  for (const [agencyId, sub] of lineMap.entries()) {
    const card = cardsMap.get(agencyId);
    if (!card) continue;
    card.lines = Array.from(sub.values())
      .map((l) => ({
        ...l,
        net_debt: round2(l.cost_total - l.payments_total),
        agency_profit: round2(l.sales_total - l.cost_total),
      }))
      .filter((l) => l.voucher_count > 0 || l.payments_total > 0)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  for (const [agencyId, summary] of eurMap.entries()) {
    const card = cardsMap.get(agencyId);
    if (!card) continue;
    summary.net_debt_eur = round2(
      summary.cost_total_eur - summary.payments_total_eur
    );
    summary.agency_profit_eur = round2(
      summary.sales_total_eur - summary.cost_total_eur
    );
    card.eur = summary;
  }

  // Cari öncelikle EUR net borca göre sıralanır (en borçlu üstte).
  const cards = Array.from(cardsMap.values()).sort((a, b) => {
    const aDebt = Math.max(0, a.eur.net_debt_eur);
    const bDebt = Math.max(0, b.eur.net_debt_eur);
    if (aDebt !== bDebt) return bDebt - aDebt;
    return (a.agency_code ?? "").localeCompare(b.agency_code ?? "");
  });

  return { data: cards };
}

/* ------------------------------------------------------------------ */
/* Public: per-agency detail                                           */
/* ------------------------------------------------------------------ */

export async function fetchAgencyCari(
  agencyId: string
): Promise<{ data: CariAgencyDetail | null; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile) return { data: null, error: "Oturum açmanız gerekiyor" };

  const adminView = isAdmin(profile);
  if (!adminView && profile.agency_id !== agencyId) {
    return { data: null, error: "Bu acenteyi görüntüleme yetkiniz yok" };
  }

  // Yetki yukarıda doğrulandı. Sales rolü RLS gereği sadece kendi kestiği
  // biletleri görebiliyor; acentenin tüm cari hesabını çıkarmak için RLS
  // bypass eden service role kullanıyoruz. agent_payments tablosuna acente
  // üyelerinin doğrudan yazma yetkisi yok — bu yalnız okuma yolu.
  let supabase: SupabaseClient;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return {
      data: null,
      error:
        "Sunucu yapılandırma hatası: SUPABASE_SERVICE_ROLE_KEY tanımlı değil. " +
        (e instanceof Error ? e.message : ""),
    };
  }

  const [{ data: agency, error: aErr }, { data: vouchers, error: vErr }, { data: payments, error: pErr }] =
    await Promise.all([
      supabase
        .from("agencies")
        .select("id, agency_code, name, is_active")
        .eq("id", agencyId)
        .maybeSingle(),
      supabase
        .from("vouchers")
        .select(
          "id, voucher_no, tour_date, customer_name, tour_id, agency_id, pax_adult, pax_child, pax_infant, currency, total_price, deposit_paid, total_price_eur, deposit_paid_eur, easybook_cost_eur, eur_rate_snapshot, eur_rate_date, source, status, created_at, tour:tours(name)"
        )
        .eq("agency_id", agencyId)
        .order("tour_date", { ascending: false }),
      supabase
        .from("agent_payments")
        .select(
          "id, agent_id, payment_amount, payment_currency, payment_amount_eur, eur_rate_snapshot, eur_rate_date, payment_date, notes, related_voucher_id, created_at, related_voucher:vouchers(voucher_no)"
        )
        .eq("agent_id", agencyId)
        .order("payment_date", { ascending: false }),
    ]);

  if (aErr) return { data: null, error: aErr.message };
  if (vErr) return { data: null, error: vErr.message };
  if (pErr) return { data: null, error: pErr.message };
  if (!agency) return { data: null, error: "Acente bulunamadı" };

  const tourIds = Array.from(
    new Set((vouchers ?? []).map((v) => v.tour_id).filter(Boolean))
  ) as string[];

  const [{ priceMap, baseMap }, { pairs: ratePairs }] = await Promise.all([
    loadPricingMaps(supabase, tourIds, [agencyId]),
    loadExchangeRatePairsForCalculation(),
  ]);

  const lineSub = new Map<Cur, CariCurrencyLine>();
  const lineFor = (c: Cur): CariCurrencyLine => {
    let line = lineSub.get(c);
    if (!line) {
      line = emptyLine(c);
      lineSub.set(c, line);
    }
    return line;
  };
  const eurSummary = emptyEurSummary();
  const fallbackEurRate = (currency: Cur): number | null =>
    computeEurRate(currency, ratePairs);

  const active: CariVoucherRow[] = [];
  const cancelled: CariVoucherRow[] = [];

  for (const v of (vouchers as VoucherRowFromDb[]) ?? []) {
    const row = computeRow(v, priceMap, baseMap, ratePairs);
    if (v.status === "cancelled") {
      cancelled.push(row);
      continue;
    }
    // active + completed: ikisi de aktif biletler bölümünde gözükür ve
    // cariye dahildir.
    active.push(row);
    const line = lineFor(row.currency);
    line.voucher_count += 1;
    line.sales_total = round2(line.sales_total + row.total_price);
    if (row.missing_cost) {
      line.missing_cost_count += 1;
    } else {
      line.cost_total = round2(line.cost_total + row.easybook_cost);
    }

    // Satış EUR toplamı
    let salesEur: number | null = row.total_price_eur;
    if (salesEur == null) {
      const fb = fallbackEurRate(row.currency);
      if (fb != null) salesEur = round2(row.total_price * fb);
    }
    if (salesEur != null) {
      eurSummary.sales_total_eur = round2(eurSummary.sales_total_eur + salesEur);
    }

    let costEur: number | null = row.easybook_cost_eur;
    if (costEur == null && !row.missing_cost) {
      const fb = fallbackEurRate(row.currency);
      if (fb != null) costEur = round2(row.easybook_cost * fb);
    }
    if (costEur != null && !row.missing_cost) {
      eurSummary.cost_total_eur = round2(eurSummary.cost_total_eur + costEur);
      eurSummary.voucher_count += 1;
    } else {
      eurSummary.voucher_count_missing_eur += 1;
    }
  }

  const paymentRows: CariAgentPaymentRow[] = [];
  for (const p of (payments as PaymentRow[]) ?? []) {
    const c = (p.payment_currency ?? "EUR").toUpperCase();
    if (!isSupportedCurrency(c)) continue;
    const line = lineFor(c);
    line.payments_total = round2(line.payments_total + (p.payment_amount ?? 0));

    let amountEur: number | null =
      p.payment_amount_eur != null ? Number(p.payment_amount_eur) : null;
    if (amountEur == null) {
      const fb = fallbackEurRate(c);
      if (fb != null) amountEur = round2((p.payment_amount ?? 0) * fb);
    }
    if (amountEur != null) {
      eurSummary.payments_total_eur = round2(
        eurSummary.payments_total_eur + amountEur
      );
    } else {
      eurSummary.payment_count_missing_eur += 1;
    }

    const rv = (p.related_voucher && !Array.isArray(p.related_voucher) ? p.related_voucher : null) as
      | { voucher_no?: string | null }
      | null;
    paymentRows.push({
      id: p.id,
      amount: round2(p.payment_amount ?? 0),
      currency: c,
      amount_eur: amountEur,
      eur_rate_snapshot:
        p.eur_rate_snapshot != null ? Number(p.eur_rate_snapshot) : null,
      eur_rate_date: p.eur_rate_date ?? null,
      payment_date: p.payment_date,
      notes: p.notes,
      related_voucher_no: rv?.voucher_no ?? null,
      created_at: p.created_at,
    });
  }

  const lines = Array.from(lineSub.values())
    .map((l) => ({
      ...l,
      net_debt: round2(l.cost_total - l.payments_total),
      agency_profit: round2(l.sales_total - l.cost_total),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  eurSummary.net_debt_eur = round2(
    eurSummary.cost_total_eur - eurSummary.payments_total_eur
  );
  eurSummary.agency_profit_eur = round2(
    eurSummary.sales_total_eur - eurSummary.cost_total_eur
  );

  return {
    data: {
      agency_id: agency.id,
      agency_code: agency.agency_code ?? null,
      agency_name: agency.name,
      is_active: agency.is_active ?? true,
      eur: eurSummary,
      lines,
      active_vouchers: active,
      cancelled_vouchers: cancelled,
      payments: paymentRows,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Admin: payment mutations                                            */
/* ------------------------------------------------------------------ */

interface RecordPaymentInput {
  agency_id: string;
  amount: number;
  currency: CurrencyType;
  payment_date: string;
  notes?: string | null;
  related_voucher_id?: string | null;
}

export async function recordAgentPayment(
  input: RecordPaymentInput
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile) return { ok: false, error: "Oturum açmanız gerekiyor" };
  if (!isAdmin(profile)) return { ok: false, error: "Yetki yok" };

  if (!input.agency_id) return { ok: false, error: "Acente seçilmedi" };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Tutar 0'dan büyük olmalı" };
  }
  if (!input.payment_date) return { ok: false, error: "Tarih gerekli" };

  const supabase = createServiceRoleClient();

  // EUR snapshot — ödeme tarihindeki TCMB kuru ile kilitle
  const paymentDate = new Date(input.payment_date + "T00:00:00Z");
  const snap = await snapshotToEur(input.amount, input.currency, paymentDate);
  const eurFields = snap
    ? {
        payment_amount_eur: snap.amountEur,
        eur_rate_snapshot: snap.rate,
        eur_rate_date: snap.rateDate,
      }
    : {};

  const { error } = await supabase.from("agent_payments").insert({
    agent_id: input.agency_id,
    payment_amount: input.amount,
    payment_currency: input.currency,
    payment_date: input.payment_date,
    notes: input.notes ?? null,
    related_voucher_id: input.related_voucher_id ?? null,
    created_by: profile.id,
    ...eurFields,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/cari");
  revalidatePath(`/cari/${input.agency_id}`);
  return { ok: true };
}

export async function deleteAgentPayment(
  paymentId: string,
  agencyId: string
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile) return { ok: false, error: "Oturum açmanız gerekiyor" };
  if (!isAdmin(profile)) return { ok: false, error: "Yetki yok" };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("agent_payments").delete().eq("id", paymentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cari");
  revalidatePath(`/cari/${agencyId}`);
  return { ok: true };
}
