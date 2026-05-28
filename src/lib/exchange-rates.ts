import type { SupabaseClient } from "@supabase/supabase-js";
import { convertPrice } from "@/lib/currency-converter";
import { round2 } from "@/lib/pricing";
import type { CurrencyType, ExchangeRate } from "@/lib/types";

export type RatePair = Pick<ExchangeRate, "from_currency" | "to_currency" | "rate">;

export interface DashboardRates {
  /** 1 EUR = X TRY */
  eurTry: number | null;
  /** 1 USD = X TRY */
  usdTry: number | null;
  /** 1 GBP = X TRY */
  gbpTry: number | null;
  /** 1 EUR = X USD */
  eurUsd: number | null;
  lastUpdated: string | null;
  effectiveDate: string;
  source: "database" | "tcmb" | "none";
}

interface TcmbCurrency {
  code: string;
  buying: number;
  selling: number;
}

/** TCMB today.xml verisinden upsert satırları üretir (exchange-rates ayarlarıyla aynı mantık). */
export function buildRatePairsFromTcmb(data: {
  USD: TcmbCurrency | null;
  EUR: TcmbCurrency | null;
  GBP: TcmbCurrency | null;
}): RatePair[] {
  const pairs: RatePair[] = [];
  const push = (from: CurrencyType, to: CurrencyType, rate: number) => {
    if (rate > 0 && Number.isFinite(rate)) {
      pairs.push({ from_currency: from, to_currency: to, rate: parseFloat(rate.toFixed(6)) });
    }
  };

  const { USD, EUR, GBP } = data;

  if (USD) push("USD", "TRY", USD.buying);
  if (EUR) push("EUR", "TRY", EUR.buying);
  if (GBP) push("GBP", "TRY", GBP.buying);

  if (USD) push("TRY", "USD", 1 / USD.selling);
  if (EUR) push("TRY", "EUR", 1 / EUR.selling);
  if (GBP) push("TRY", "GBP", 1 / GBP.selling);

  if (EUR && USD) {
    push("EUR", "USD", EUR.buying / USD.selling);
    push("USD", "EUR", USD.buying / EUR.selling);
  }
  if (GBP && USD) {
    push("GBP", "USD", GBP.buying / USD.selling);
    push("USD", "GBP", USD.buying / GBP.selling);
  }
  if (GBP && EUR) {
    push("GBP", "EUR", GBP.buying / EUR.selling);
    push("EUR", "GBP", EUR.buying / GBP.selling);
  }

  return pairs;
}

/** Veritabanından belirli tarih için en güncel kur çiftlerini düz liste olarak yükler. */
export async function loadExchangeRatePairs(
  supabase: SupabaseClient,
  date: string = new Date().toISOString().split("T")[0]
): Promise<{ pairs: RatePair[]; lastUpdated: string | null }> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("from_currency, to_currency, rate, effective_date, updated_at")
    .lte("effective_date", date)
    .order("effective_date", { ascending: false });

  if (error || !data?.length) {
    return { pairs: [], lastUpdated: null };
  }

  const seen = new Set<string>();
  const pairs: RatePair[] = [];
  let lastUpdated: string | null = null;

  for (const row of data) {
    const key = `${row.from_currency}-${row.to_currency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({
      from_currency: row.from_currency as CurrencyType,
      to_currency: row.to_currency as CurrencyType,
      rate: Number(row.rate),
    });
    if (row.updated_at && (!lastUpdated || row.updated_at > lastUpdated)) {
      lastUpdated = row.updated_at;
    }
  }

  return { pairs, lastUpdated };
}

/** Hesaplama akışları için kur listesi (service role ile okunur). */
export async function loadExchangeRatePairsForCalculation(
  date?: string
): Promise<{ pairs: RatePair[]; lastUpdated: string | null }> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    return loadExchangeRatePairs(createServiceRoleClient(), date);
  } catch {
    const { createServerSupabaseClient } = await import("@/lib/supabase-server");
    return loadExchangeRatePairs(await createServerSupabaseClient(), date);
  }
}

export async function upsertExchangeRatePairs(
  supabase: SupabaseClient,
  pairs: RatePair[],
  effectiveDate: string = new Date().toISOString().split("T")[0]
): Promise<void> {
  if (!pairs.length) return;
  const now = new Date().toISOString();
  const rows = pairs.map((p) => ({
    from_currency: p.from_currency,
    to_currency: p.to_currency,
    rate: p.rate,
    effective_date: effectiveDate,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(rows, { onConflict: "from_currency,to_currency,effective_date" });

  if (error) throw error;
}

function findRate(pairs: RatePair[], from: CurrencyType, to: CurrencyType): number | null {
  const direct = pairs.find((p) => p.from_currency === from && p.to_currency === to);
  return direct?.rate ?? null;
}

/** Türkiye saatine göre YYYY-MM-DD (gece yarısı cron için). */
export function getIstanbulDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export interface SyncTcmbResult {
  success: boolean;
  effectiveDate?: string;
  pairCount?: number;
  lastUpdate?: string;
  error?: string;
}

/**
 * TCMB'den güncel kurları çekip exchange_rates tablosuna yazar.
 * Gece 00:00 (Europe/Istanbul) cron ve manuel senkron için kullanılır.
 */
export async function syncTcmbRatesToDatabase(
  supabase: SupabaseClient,
  effectiveDate?: string
): Promise<SyncTcmbResult> {
  const date = effectiveDate ?? getIstanbulDateString();
  const tcmb = await fetchTcmbRatesRaw();
  if (!tcmb.success || !tcmb.data) {
    return { success: false, error: tcmb.error ?? "TCMB verisi alınamadı" };
  }

  const pairs = buildRatePairsFromTcmb(tcmb.data);
  if (pairs.length === 0) {
    return { success: false, error: "TCMB'den geçerli kur çifti üretilemedi" };
  }

  await upsertExchangeRatePairs(supabase, pairs, date);

  return {
    success: true,
    effectiveDate: date,
    pairCount: pairs.length,
    lastUpdate: tcmb.lastUpdate ?? new Date().toISOString(),
  };
}

/** Dashboard için özet kurlar; eksikse TCMB'den çekip kaydeder. */
export async function getDashboardExchangeRates(
  supabase: SupabaseClient
): Promise<DashboardRates> {
  const effectiveDate = new Date().toISOString().split("T")[0];
  let { pairs, lastUpdated } = await loadExchangeRatePairs(supabase, effectiveDate);
  let source: DashboardRates["source"] = pairs.length ? "database" : "none";

  const needsSync =
    !findRate(pairs, "EUR", "TRY") ||
    !findRate(pairs, "USD", "TRY") ||
    !findRate(pairs, "GBP", "TRY");

  if (needsSync) {
    const sync = await syncTcmbRatesToDatabase(supabase, effectiveDate);
    if (sync.success) {
      const loaded = await loadExchangeRatePairs(supabase, effectiveDate);
      pairs = loaded.pairs;
      lastUpdated = sync.lastUpdate ?? loaded.lastUpdated;
      source = "tcmb";
    }
  }

  return {
    eurTry: findRate(pairs, "EUR", "TRY"),
    usdTry: findRate(pairs, "USD", "TRY"),
    gbpTry: findRate(pairs, "GBP", "TRY"),
    eurUsd: findRate(pairs, "EUR", "USD"),
    lastUpdated,
    effectiveDate,
    source,
  };
}

/** TCMB XML ham verisi (server-only). */
export async function fetchTcmbRatesRaw(): Promise<{
  success: boolean;
  data?: { USD: TcmbCurrency | null; EUR: TcmbCurrency | null; GBP: TcmbCurrency | null };
  lastUpdate?: string;
  error?: string;
}> {
  try {
    const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("TCMB erişim hatası");

    const xmlText = await response.text();
    const extractRate = (code: string): TcmbCurrency | null => {
      const currencyBlockRegex = new RegExp(
        `<Currency CrossOrder="[^"]*" Kod="${code}" CurrencyCode="${code}">([\\s\\S]*?)<\\/Currency>`,
        "i"
      );
      const match = xmlText.match(currencyBlockRegex);
      if (!match) return null;
      const block = match[1];
      const buyingMatch = block.match(/<ForexBuying>([0-9.]+)<\/ForexBuying>/);
      const sellingMatch = block.match(/<ForexSelling>([0-9.]+)<\/ForexSelling>/);
      if (buyingMatch && sellingMatch) {
        return {
          code,
          buying: parseFloat(buyingMatch[1]),
          selling: parseFloat(sellingMatch[1]),
        };
      }
      return null;
    };

    return {
      success: true,
      data: {
        USD: extractRate("USD"),
        EUR: extractRate("EUR"),
        GBP: extractRate("GBP"),
      },
      lastUpdate: new Date().toISOString(),
    };
  } catch {
    return { success: false, error: "Merkez Bankası verileri alınamadı." };
  }
}

export interface ResolvedBasePrices {
  adult: number | null;
  child: number | null;
  missing: boolean;
}

/**
 * Tur taban fiyatlarını hedef para birimine çözer.
 * EUR ana kaynak; TRY ayrı sütun; USD/GBP EUR'dan güncel kurla türetilir.
 */
export function resolveTourBaseInCurrency(
  currency: CurrencyType,
  eurAdult: number | null | undefined,
  eurChild: number | null | undefined,
  tryAdult: number | null | undefined,
  tryChild: number | null | undefined,
  rates: RatePair[]
): ResolvedBasePrices {
  const conv = (amount: number | null | undefined, from: CurrencyType, to: CurrencyType) => {
    if (amount == null || amount <= 0) return null;
    return round2(convertPrice(amount, from, to, rates));
  };

  if (currency === "EUR") {
    const adult = eurAdult != null && eurAdult > 0 ? round2(eurAdult) : null;
    const child = eurChild != null && eurChild > 0 ? round2(eurChild) : null;
    return { adult, child, missing: !adult && !child };
  }

  if (currency === "TRY") {
    let adult =
      tryAdult != null && tryAdult > 0 ? round2(tryAdult) : conv(eurAdult, "EUR", "TRY");
    let child =
      tryChild != null && tryChild > 0 ? round2(tryChild) : conv(eurChild, "EUR", "TRY");
    return { adult, child, missing: !adult && !child };
  }

  const adult = conv(eurAdult, "EUR", currency);
  const child = conv(eurChild, "EUR", currency);
  return { adult, child, missing: !adult && !child };
}

/**
 * Acente fiyat/maliyet satırını hedef para birimine çözer.
 * Önce doğrudan currency satırı; yoksa EUR satırından dönüştür.
 */
export function resolveAgencyAmountInCurrency(
  currency: CurrencyType,
  directAdult: number | null | undefined,
  directChild: number | null | undefined,
  eurAdult: number | null | undefined,
  eurChild: number | null | undefined,
  rates: RatePair[]
): { adult: number | null; child: number | null } {
  const hasDirect =
    (directAdult != null && directAdult > 0) || (directChild != null && directChild > 0);
  if (hasDirect) {
    return {
      adult: directAdult != null && directAdult > 0 ? round2(directAdult) : null,
      child: directChild != null && directChild > 0 ? round2(directChild) : null,
    };
  }

  if (currency === "EUR") {
    return {
      adult: eurAdult != null && eurAdult > 0 ? round2(eurAdult) : null,
      child: eurChild != null && eurChild > 0 ? round2(eurChild) : null,
    };
  }

  const conv = (n: number | null | undefined) => {
    if (n == null || n <= 0) return null;
    return round2(convertPrice(n, "EUR", currency, rates));
  };

  return { adult: conv(eurAdult), child: conv(eurChild) };
}
