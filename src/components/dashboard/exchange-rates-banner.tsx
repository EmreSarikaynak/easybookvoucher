import Link from "next/link";
import { TrendingUp, Settings } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getDashboardExchangeRates } from "@/lib/exchange-rates";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";

function formatRate(value: number | null, decimals = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export async function ExchangeRatesBanner() {
  let rates;
  try {
    const supabase = createServiceRoleClient();
    rates = await getDashboardExchangeRates(supabase);
  } catch {
    return null;
  }

  const profile = await getCurrentUser();
  const admin = isAdmin(profile);

  const updatedLabel = rates.lastUpdated
    ? new Date(rates.lastUpdated).toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const sourceLabel =
    rates.source === "tcmb"
      ? "TCMB"
      : rates.source === "database"
        ? "Kayıtlı kur"
        : null;

  const items = [
    { label: "EUR → TRY", value: rates.eurTry, unit: "₺" },
    { label: "USD → TRY", value: rates.usdTry, unit: "₺" },
    { label: "GBP → TRY", value: rates.gbpTry, unit: "₺" },
    { label: "EUR → USD", value: rates.eurUsd, unit: "$" },
  ].filter((i) => i.value != null);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Güncel döviz kurları"
      className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Güncel Döviz Kurları</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {updatedLabel ? (
                <>
                  Son güncelleme: <span className="font-medium text-foreground">{updatedLabel}</span>
                  {sourceLabel && (
                    <span className="text-muted-foreground"> · {sourceLabel}</span>
                  )}
                </>
              ) : (
                `Geçerlilik: ${rates.effectiveDate}`
              )}
            </p>
          </div>
        </div>

        <Link
          href="/exchange-rates"
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-md border bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground sm:self-center"
        >
          <Settings className="h-3 w-3" />
          {admin ? "Kur yönetimi" : "Tüm kurlar"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px border-t bg-slate-200 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-white px-3 py-2.5 text-center sm:px-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatRate(item.value)}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {item.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      <p className="border-t px-4 py-2 text-[10px] text-muted-foreground">
        Fiyat ve maliyet hesapları EUR tabanlıdır; USD/GBP tutarlar bu kurlarla otomatik
        hesaplanır.
      </p>
    </section>
  );
}
