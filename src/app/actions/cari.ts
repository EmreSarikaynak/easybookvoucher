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
import { resolveCatalogDisplayPrice } from "@/lib/tour-catalog-data";
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
  payments_total: number;  // acentenin EasyBook'a yaptığı ödemeler
  net_debt: number;        // cost − payments
  voucher_count: number;
  missing_cost_count: number;
}

export interface CariAgencyCardData {
  agency_id: string;
  agency_code: string | null;
  agency_name: string;
  is_active: boolean;
  voucher_count_active: number;
  voucher_count_cancelled: number;
  last_activity: string | null; // ISO date
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
  /** EasyBook'un bu biletten alacağı (alacak). */
  easybook_cost: number;
  missing_cost: boolean;
  source: string;
  created_at: string;
}

export interface CariAgentPaymentRow {
  id: string;
  amount: number;
  currency: Cur;
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
  lines: CariCurrencyLine[];
  active_vouchers: CariVoucherRow[];
  cancelled_vouchers: CariVoucherRow[];
  payments: CariAgentPaymentRow[];
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function emptyLine(c: Cur): CariCurrencyLine {
  return {
    currency: c,
    cost_total: 0,
    payments_total: 0,
    net_debt: 0,
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
}

interface PaymentRow {
  id: string;
  agent_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_date: string;
  notes: string | null;
  related_voucher_id: string | null;
  created_at: string;
  related_voucher?: { voucher_no?: string | null } | null;
}

function computeRow(
  v: VoucherRowFromDb,
  priceMap: Map<string, PriceRow>,
  baseMap: Map<string, BaseRow>
): CariVoucherRow {
  const currency = (v.currency || "EUR").toUpperCase();
  const cur: Cur = isSupportedCurrency(currency) ? currency : "EUR";
  const tourId = v.tour_id ?? "";
  const agencyId = v.agency_id ?? "";
  const paxAdult = v.pax_adult ?? 0;
  const paxChild = v.pax_child ?? 0;

  const prices = priceMap.get(`${agencyId}__${tourId}__${cur}`);
  const base = baseMap.get(tourId);

  const baseAdult =
    cur === "EUR" ? base?.base_price_adult_eur : cur === "TRY" ? base?.base_price_adult_try : null;
  const baseChild =
    cur === "EUR" ? base?.base_price_child_eur : cur === "TRY" ? base?.base_price_child_try : null;

  const cost = resolvePerPaxCost(
    prices?.cost_adult,
    prices?.cost_child,
    baseAdult,
    baseChild
  );
  const list = resolveCatalogDisplayPrice(
    prices?.price_adult,
    prices?.price_child,
    baseAdult,
    baseChild
  );

  const earnings = computeVoucherEarnings({
    paxAdult,
    paxChild,
    totalPrice: v.total_price ?? 0,
    cost,
    listAdult: list.price_adult,
    listChild: list.price_child,
  });

  const tourRow = (v.tour && !Array.isArray(v.tour) ? v.tour : null) as
    | { name?: string | null }
    | null;

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
        "id, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try"
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
          "id, voucher_no, tour_date, customer_name, tour_id, agency_id, pax_adult, pax_child, pax_infant, currency, total_price, deposit_paid, source, status, created_at, tour:tours(name)"
        ),
      supabase
        .from("agent_payments")
        .select("id, agent_id, payment_amount, payment_currency, payment_date, notes, related_voucher_id, created_at"),
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

  const { priceMap, baseMap } = await loadPricingMaps(supabase, tourIds, agencyIds);

  const cardsMap = new Map<string, CariAgencyCardData>();
  for (const a of agencies ?? []) {
    cardsMap.set(a.id, {
      agency_id: a.id,
      agency_code: a.agency_code ?? null,
      agency_name: a.name,
      is_active: a.is_active ?? true,
      voucher_count_active: 0,
      voucher_count_cancelled: 0,
      last_activity: null,
      lines: [],
    });
  }

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

    const row = computeRow(v, priceMap, baseMap);
    const line = lineFor(agencyId, row.currency);
    line.voucher_count += 1;
    if (row.missing_cost) {
      line.missing_cost_count += 1;
    } else {
      line.cost_total = round2(line.cost_total + row.easybook_cost);
    }
  }

  for (const p of (payments as PaymentRow[]) ?? []) {
    const c = (p.payment_currency ?? "EUR").toUpperCase();
    if (!isSupportedCurrency(c)) continue;
    const line = lineFor(p.agent_id, c);
    line.payments_total = round2(line.payments_total + (p.payment_amount ?? 0));
  }

  for (const [agencyId, sub] of lineMap.entries()) {
    const card = cardsMap.get(agencyId);
    if (!card) continue;
    card.lines = Array.from(sub.values())
      .map((l) => ({
        ...l,
        net_debt: round2(l.cost_total - l.payments_total),
      }))
      .filter((l) => l.voucher_count > 0 || l.payments_total > 0)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  const cards = Array.from(cardsMap.values()).sort((a, b) => {
    const aDebt = a.lines.reduce((s, l) => s + Math.max(0, l.net_debt), 0);
    const bDebt = b.lines.reduce((s, l) => s + Math.max(0, l.net_debt), 0);
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
          "id, voucher_no, tour_date, customer_name, tour_id, agency_id, pax_adult, pax_child, pax_infant, currency, total_price, deposit_paid, source, status, created_at, tour:tours(name)"
        )
        .eq("agency_id", agencyId)
        .order("tour_date", { ascending: false }),
      supabase
        .from("agent_payments")
        .select(
          "id, agent_id, payment_amount, payment_currency, payment_date, notes, related_voucher_id, created_at, related_voucher:vouchers(voucher_no)"
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

  const { priceMap, baseMap } = await loadPricingMaps(supabase, tourIds, [agencyId]);

  const lineSub = new Map<Cur, CariCurrencyLine>();
  const lineFor = (c: Cur): CariCurrencyLine => {
    let line = lineSub.get(c);
    if (!line) {
      line = emptyLine(c);
      lineSub.set(c, line);
    }
    return line;
  };

  const active: CariVoucherRow[] = [];
  const cancelled: CariVoucherRow[] = [];

  for (const v of (vouchers as VoucherRowFromDb[]) ?? []) {
    const row = computeRow(v, priceMap, baseMap);
    if (v.status === "cancelled") {
      cancelled.push(row);
      continue;
    }
    // active + completed: ikisi de aktif biletler bölümünde gözükür ve
    // cariye dahildir.
    active.push(row);
    const line = lineFor(row.currency);
    line.voucher_count += 1;
    if (row.missing_cost) {
      line.missing_cost_count += 1;
    } else {
      line.cost_total = round2(line.cost_total + row.easybook_cost);
    }
  }

  const paymentRows: CariAgentPaymentRow[] = [];
  for (const p of (payments as PaymentRow[]) ?? []) {
    const c = (p.payment_currency ?? "EUR").toUpperCase();
    if (!isSupportedCurrency(c)) continue;
    const line = lineFor(c);
    line.payments_total = round2(line.payments_total + (p.payment_amount ?? 0));
    const rv = (p.related_voucher && !Array.isArray(p.related_voucher) ? p.related_voucher : null) as
      | { voucher_no?: string | null }
      | null;
    paymentRows.push({
      id: p.id,
      amount: round2(p.payment_amount ?? 0),
      currency: c,
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
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    data: {
      agency_id: agency.id,
      agency_code: agency.agency_code ?? null,
      agency_name: agency.name,
      is_active: agency.is_active ?? true,
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
  const { error } = await supabase.from("agent_payments").insert({
    agent_id: input.agency_id,
    payment_amount: input.amount,
    payment_currency: input.currency,
    payment_date: input.payment_date,
    notes: input.notes ?? null,
    related_voucher_id: input.related_voucher_id ?? null,
    created_by: profile.id,
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
