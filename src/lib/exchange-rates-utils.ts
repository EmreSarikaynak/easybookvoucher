/**
 * Client-safe pure helpers for exchange rates.
 *
 * Bu dosya hiçbir server-only modül (next/headers, supabase-server, vs.)
 * import ETMEZ — `"use client"` bileşenlerinden güvenle çağrılır.
 * Server-only fonksiyonlar (loadExchangeRatePairs, syncTcmbRatesToDatabase,
 * vs.) `src/lib/exchange-rates.ts` içindedir ve sadece server-side
 * dosyalardan import edilmelidir.
 */

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

export interface TcmbCurrency {
  code: string;
  buying: number;
  selling: number;
}

/** TCMB today.xml verisinden upsert satırları üretir. */
export function buildRatePairsFromTcmb(data: {
  USD: TcmbCurrency | null;
  EUR: TcmbCurrency | null;
  GBP: TcmbCurrency | null;
}): RatePair[] {
  const { USD, EUR, GBP } = data;
  const pairs: RatePair[] = [];
  const push = (
    from: CurrencyType,
    to: CurrencyType,
    rate: number | null | undefined
  ) => {
    if (rate == null || !Number.isFinite(rate) || rate <= 0) return;
    pairs.push({ from_currency: from, to_currency: to, rate });
  };

  if (USD) {
    push("USD", "TRY", USD.selling);
    push("TRY", "USD", USD.buying ? 1 / USD.buying : null);
  }
  if (EUR) {
    push("EUR", "TRY", EUR.selling);
    push("TRY", "EUR", EUR.buying ? 1 / EUR.buying : null);
  }
  if (GBP) {
    push("GBP", "TRY", GBP.selling);
    push("TRY", "GBP", GBP.buying ? 1 / GBP.buying : null);
  }
  if (USD && EUR) {
    push("EUR", "USD", EUR.buying / USD.selling);
    push("USD", "EUR", USD.buying / EUR.selling);
  }
  if (USD && GBP) {
    push("GBP", "USD", GBP.buying / USD.selling);
    push("USD", "GBP", USD.buying / GBP.selling);
  }
  if (EUR && GBP) {
    push("GBP", "EUR", GBP.buying / EUR.selling);
    push("EUR", "GBP", EUR.buying / GBP.selling);
  }

  return pairs;
}

/** Türkiye saatine göre YYYY-MM-DD (gece yarısı cron için). */
export function getIstanbulDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export interface ResolvedBasePrices {
  adult: number | null;
  child: number | null;
}

/** Tur taban fiyatını hedef currency'de döner. EUR/TRY direkt, USD/GBP çevirim. */
export function resolveTourBaseInCurrency(
  target: CurrencyType,
  baseAdultEur: number | null | undefined,
  baseChildEur: number | null | undefined,
  baseAdultTry: number | null | undefined,
  baseChildTry: number | null | undefined,
  rates: RatePair[]
): ResolvedBasePrices {
  const conv = (
    amount: number | null | undefined,
    from: CurrencyType,
    to: CurrencyType
  ): number | null => {
    if (amount == null) return null;
    if (from === to) return amount;
    return round2(convertPrice(amount, from, to, rates));
  };

  if (target === "EUR") {
    return { adult: baseAdultEur ?? null, child: baseChildEur ?? null };
  }
  if (target === "TRY") {
    return { adult: baseAdultTry ?? null, child: baseChildTry ?? null };
  }
  // USD/GBP: önce EUR üzerinden çevir, EUR yoksa TRY
  const fromEur = baseAdultEur != null || baseChildEur != null;
  if (fromEur) {
    return {
      adult: conv(baseAdultEur, "EUR", target),
      child: conv(baseChildEur, "EUR", target),
    };
  }
  return {
    adult: conv(baseAdultTry, "TRY", target),
    child: conv(baseChildTry, "TRY", target),
  };
}

export interface ResolvedAgencyAmounts {
  adult: number | null;
  child: number | null;
}

/**
 * Agency_tour_prices satırından hedef currency'de tutar döner.
 * Önce hedef currency'de doğrudan satır varsa onu, yoksa EUR satırını
 * çevirerek döner.
 */
export function resolveAgencyAmountInCurrency(
  target: CurrencyType,
  directAdult: number | null | undefined,
  directChild: number | null | undefined,
  eurAdult: number | null | undefined,
  eurChild: number | null | undefined,
  rates: RatePair[]
): ResolvedAgencyAmounts {
  // Hedef currency'de doğrudan satır varsa (null değilse) onu kullan.
  // 0 da geçerli bir override (admin "ücretsiz" yazmış olabilir) — > 0 kontrolü yapma.
  if (directAdult != null || directChild != null) {
    return { adult: directAdult ?? null, child: directChild ?? null };
  }
  if (target === "EUR") {
    return { adult: eurAdult ?? null, child: eurChild ?? null };
  }
  const conv = (n: number | null | undefined): number | null => {
    if (n == null) return null;
    return round2(convertPrice(n, "EUR", target, rates));
  };
  return { adult: conv(eurAdult), child: conv(eurChild) };
}
