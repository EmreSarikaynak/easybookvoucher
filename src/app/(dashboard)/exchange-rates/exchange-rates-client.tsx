"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { syncExchangeRatesFromTcmb } from "@/app/actions/exchange";
import type { CurrencyType } from "@/lib/types";

interface ExchangeRatesPageClientProps {
  admin: boolean;
  effectiveDate: string;
  lastUpdated: string | null;
  source: string;
  summary: {
    eurTry: number | null;
    usdTry: number | null;
    gbpTry: number | null;
    eurUsd: number | null;
  };
  matrix: Record<string, Record<string, number>>;
  currencies: CurrencyType[];
  currencySymbols: Record<CurrencyType, string>;
}

function formatRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function ExchangeRatesPageClient({
  admin,
  effectiveDate,
  lastUpdated,
  source,
  summary,
  matrix,
  currencies,
  currencySymbols,
}: ExchangeRatesPageClientProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleSync = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await syncExchangeRatesFromTcmb();
      if (res.success) {
        setMessage(
          `✅ ${res.pairCount ?? 0} kur çifti kaydedildi (${res.effectiveDate}). Sayfa yenileniyor…`
        );
        window.location.reload();
      } else {
        setMessage(`❌ ${res.error ?? "Senkron başarısız"}`);
      }
    });
  };

  const highlights = [
    { label: "1 EUR", value: summary.eurTry, suffix: "TRY" },
    { label: "1 USD", value: summary.usdTry, suffix: "TRY" },
    { label: "1 GBP", value: summary.gbpTry, suffix: "TRY" },
    { label: "1 EUR", value: summary.eurUsd, suffix: "USD" },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Özet</CardTitle>
              <CardDescription>
                Geçerlilik tarihi: <strong>{effectiveDate}</strong>
                {updatedLabel && (
                  <>
                    {" "}
                    · Son kayıt: <strong>{updatedLabel}</strong>
                  </>
                )}
                {source === "tcmb" && " · TCMB"}
              </CardDescription>
            </div>
            {admin && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  TCMB&apos;den güncelle
                </Button>
                <Button type="button" variant="secondary" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Matris düzenle
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {highlights.map((h) => (
              <div
                key={h.label + h.suffix}
                className="rounded-lg border bg-muted/30 px-3 py-2.5 text-center"
              >
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {h.label} =
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">
                  {formatRate(h.value)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {h.suffix}
                  </span>
                </p>
              </div>
            ))}
          </div>
          {message && (
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kur matrisi</CardTitle>
          <CardDescription>
            {admin
              ? "Otomatik gece senkronu dışında manuel düzenleme için Ayarlar sayfasını kullanın."
              : "Güncel dönüşüm oranları (salt okunur)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Kaynak</TableHead>
                {currencies.map((to) => (
                  <TableHead key={to} className="text-center text-xs">
                    {to}
                    <span className="text-muted-foreground">
                      {" "}
                      ({currencySymbols[to]})
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((from) => (
                <TableRow key={from}>
                  <TableCell className="font-medium text-xs">
                    {from} ({currencySymbols[from]})
                  </TableCell>
                  {currencies.map((to) => (
                    <TableCell key={to} className="text-center text-xs tabular-nums">
                      {from === to ? (
                        <span className="text-muted-foreground">1</span>
                      ) : (
                        formatRate(matrix[from]?.[to])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
