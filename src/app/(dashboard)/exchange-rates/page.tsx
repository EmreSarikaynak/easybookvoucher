import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import {
  getDashboardExchangeRates,
  getIstanbulDateString,
  loadExchangeRatePairsForCalculation,
} from "@/lib/exchange-rates";
import { ExchangeRatesPageClient } from "./exchange-rates-client";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExchangeRatesPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/");

  const admin = isAdmin(profile);
  let rates;
  let pairs: Awaited<ReturnType<typeof loadExchangeRatePairsForCalculation>>["pairs"] =
    [];
  let lastUpdated: string | null = null;

  try {
    const supabase = createServiceRoleClient();
    rates = await getDashboardExchangeRates(supabase);
    const loaded = await loadExchangeRatePairsForCalculation(getIstanbulDateString());
    pairs = loaded.pairs;
    lastUpdated = loaded.lastUpdated ?? rates.lastUpdated;
  } catch {
    const supabase = await createServerSupabaseClient();
    const loaded = await loadExchangeRatePairsForCalculation(getIstanbulDateString());
    pairs = loaded.pairs;
    lastUpdated = loaded.lastUpdated;
    rates = {
      eurTry: null,
      usdTry: null,
      gbpTry: null,
      eurUsd: null,
      lastUpdated,
      effectiveDate: getIstanbulDateString(),
      source: "none" as const,
    };
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const from of CURRENCY_OPTIONS) {
    matrix[from] = {};
    for (const to of CURRENCY_OPTIONS) {
      if (from === to) {
        matrix[from][to] = 1;
        continue;
      }
      const p = pairs.find((x) => x.from_currency === from && x.to_currency === to);
      matrix[from][to] = p?.rate ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Döviz Kurları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            TCMB kurları her gece saat 00:00&apos;da (İstanbul) otomatik kaydedilir.
            Bilet ve cari hesaplamaları EUR tabanlı bu kurlarla yapılır.
          </p>
        </div>
      </div>

      <ExchangeRatesPageClient
        admin={admin}
        effectiveDate={rates.effectiveDate}
        lastUpdated={lastUpdated}
        source={rates.source}
        summary={{
          eurTry: rates.eurTry,
          usdTry: rates.usdTry,
          gbpTry: rates.gbpTry,
          eurUsd: rates.eurUsd,
        }}
        matrix={matrix}
        currencySymbols={CURRENCY_SYMBOLS}
        currencies={CURRENCY_OPTIONS}
      />
    </div>
  );
}
