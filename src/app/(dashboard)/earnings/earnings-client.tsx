"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EarningsReport } from "@/app/actions/earnings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertCircle, Wallet, Building2, Layers } from "lucide-react";

const currencySymbol = (c: string) =>
  c === "TRY" ? "₺" : c === "USD" ? "$" : c === "GBP" ? "£" : "€";

const fmt = (c: string, v: number) => `${currencySymbol(c)}${v.toFixed(0)}`;

export function EarningsClient({ initialReport }: { initialReport: EarningsReport }) {
  const router = useRouter();
  const [start, setStart] = useState(initialReport.startDate);
  const [end, setEnd] = useState(initialReport.endDate);

  const apply = () => {
    const params = new URLSearchParams();
    params.set("start", start);
    params.set("end", end);
    if (initialReport.filterAgencyId) {
      params.set("agency", initialReport.filterAgencyId);
    }
    router.push(`/earnings?${params.toString()}`);
  };

  const grandTotalsByCurrency: Record<
    string,
    {
      sales: number;
      debt: number;
      deposit: number;
      standardMargin: number;
      extraMarkup: number;
      profit: number;
    }
  > = {};
  for (const s of initialReport.agencySummaries) {
    for (const [c, v] of Object.entries(s.totals_by_currency)) {
      if (!grandTotalsByCurrency[c]) {
        grandTotalsByCurrency[c] = {
          sales: 0,
          debt: 0,
          deposit: 0,
          standardMargin: 0,
          extraMarkup: 0,
          profit: 0,
        };
      }
      const g = grandTotalsByCurrency[c];
      g.sales += v.total_sales;
      g.debt += v.easybook_debt;
      g.deposit += v.collected_deposit;
      g.standardMargin += v.standard_margin;
      g.extraMarkup += v.extra_markup;
      g.profit += v.total_profit;
    }
  }

  const missingCostTotal = initialReport.rows.filter((r) => r.missing_cost).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2 flex-1">
            <Label>Başlangıç Tarihi</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Bitiş Tarihi</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button onClick={apply}>Filtreyi Uygula</Button>
        </CardContent>
      </Card>

      {missingCostTotal > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>{missingCostTotal} bilette</strong> EasyBook maliyeti tanımlı
            değil (USD/GBP bilet ya da turun taban fiyatı girilmemiş). Bu biletler
            borç ve kazanç toplamlarına <strong>dahil edilmedi</strong> — aşağıda
            &quot;maliyet eksik&quot; olarak işaretlendi.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(grandTotalsByCurrency).map(([c, v]) => (
          <Card key={c}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> Toplam Satış ({c})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{fmt(c, v.sales)}</p>
              <p className="text-xs text-muted-foreground">
                Tahsil edilen: {fmt(c, v.deposit)}
              </p>
              <p className="text-xs flex items-center gap-1 text-amber-700">
                <AlertCircle className="h-3 w-3" /> EasyBook&apos;a borç:{" "}
                <strong>{fmt(c, v.debt)}</strong>
              </p>
              <p className="text-xs flex items-center gap-1 text-sky-700">
                <Layers className="h-3 w-3" /> Standart marj:{" "}
                <strong>{fmt(c, v.standardMargin)}</strong>
              </p>
              <p className="text-xs flex items-center gap-1 text-violet-700">
                <TrendingUp className="h-3 w-3" /> Ekstra fark (upsell):{" "}
                <strong>{fmt(c, v.extraMarkup)}</strong>
              </p>
              <p className="text-sm flex items-center gap-1 text-emerald-700 pt-1 border-t mt-1">
                <TrendingUp className="h-3.5 w-3.5" /> Toplam kazanç:{" "}
                <strong>{fmt(c, v.profit)}</strong>
              </p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(grandTotalsByCurrency).length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Seçilen tarih aralığında bilet bulunmuyor.
            </CardContent>
          </Card>
        )}
      </div>

      {initialReport.isAdminView && initialReport.agencySummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Acente Bazlı Özet (Admin Görünümü)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Acente</th>
                    <th className="py-2 pr-3 font-medium">Bilet</th>
                    <th className="py-2 pr-3 font-medium">PAX (Y/Ç)</th>
                    <th className="py-2 pr-3 font-medium">Para</th>
                    <th className="py-2 pr-3 font-medium text-right">Satış</th>
                    <th className="py-2 pr-3 font-medium text-right">Tahsil</th>
                    <th className="py-2 pr-3 font-medium text-right text-amber-700">
                      EasyBook Alacak
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-sky-700">
                      Standart Marj
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-violet-700">
                      Ekstra Fark
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-emerald-700">
                      Toplam Kazanç
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {initialReport.agencySummaries.flatMap((s) =>
                    Object.entries(s.totals_by_currency).map(([c, v]) => (
                      <tr key={`${s.agency_id}-${c}`} className="hover:bg-muted/30">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{s.agency_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {s.agency_code}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          {s.voucher_count}
                          {v.missing_cost_count > 0 && (
                            <span className="ml-1 text-[11px] text-amber-700">
                              ({v.missing_cost_count} eksik)
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {s.total_pax_adult}/{s.total_pax_child}
                        </td>
                        <td className="py-2 pr-3 text-xs">{c}</td>
                        <td className="py-2 pr-3 text-right">{fmt(c, v.total_sales)}</td>
                        <td className="py-2 pr-3 text-right">
                          {fmt(c, v.collected_deposit)}
                        </td>
                        <td className="py-2 pr-3 text-right text-amber-700 font-semibold">
                          {fmt(c, v.easybook_debt)}
                        </td>
                        <td className="py-2 pr-3 text-right text-sky-700">
                          {fmt(c, v.standard_margin)}
                        </td>
                        <td className="py-2 pr-3 text-right text-violet-700">
                          {fmt(c, v.extra_markup)}
                        </td>
                        <td className="py-2 pr-3 text-right text-emerald-700 font-semibold">
                          {fmt(c, v.total_profit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bilet Detayı ({initialReport.rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Tarih</th>
                  <th className="py-2 pr-3 font-medium">Bilet</th>
                  <th className="py-2 pr-3 font-medium">Tur</th>
                  {initialReport.isAdminView && (
                    <th className="py-2 pr-3 font-medium">Acente</th>
                  )}
                  <th className="py-2 pr-3 font-medium">PAX</th>
                  <th className="py-2 pr-3 font-medium">Kaynak</th>
                  <th className="py-2 pr-3 font-medium text-right">Satış</th>
                  <th className="py-2 pr-3 font-medium text-right text-amber-700">Maliyet</th>
                  <th className="py-2 pr-3 font-medium text-right text-sky-700">Std. Marj</th>
                  <th className="py-2 pr-3 font-medium text-right text-violet-700">Ekstra</th>
                  <th className="py-2 pr-3 font-medium text-right">Tahsil</th>
                  <th className="py-2 pr-3 font-medium text-right text-emerald-700">Kazanç</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialReport.rows.map((r) => {
                  return (
                    <tr key={r.voucher_id} className="hover:bg-muted/30">
                      <td className="py-2 pr-3 text-xs">{r.voucher_date}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.voucher_no}</td>
                      <td className="py-2 pr-3">{r.tour_name}</td>
                      {initialReport.isAdminView && (
                        <td className="py-2 pr-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.agency_code}
                          </span>{" "}
                          {r.agency_name}
                        </td>
                      )}
                      <td className="py-2 pr-3 text-xs">
                        {r.pax_adult}Y
                        {r.pax_child > 0 ? ` + ${r.pax_child}Ç` : ""}
                        {r.pax_infant > 0 ? ` + ${r.pax_infant}B` : ""}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {r.source === "public_qr" ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                            QR
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">manuel</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">{fmt(r.currency, r.total_price)}</td>
                      {r.missing_cost ? (
                        <td
                          colSpan={4}
                          className="py-2 pr-3 text-center text-[11px]"
                        >
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            <AlertCircle className="h-3 w-3" /> maliyet eksik
                          </span>
                          <span className="ml-2 text-muted-foreground align-middle">
                            Tahsil: {fmt(r.currency, r.deposit_paid)}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-3 text-right text-amber-700">
                            {fmt(r.currency, r.easybook_cost)}
                          </td>
                          <td className="py-2 pr-3 text-right text-sky-700">
                            {fmt(r.currency, r.standard_margin)}
                          </td>
                          <td className="py-2 pr-3 text-right text-violet-700">
                            {fmt(r.currency, r.extra_markup)}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {fmt(r.currency, r.deposit_paid)}
                          </td>
                        </>
                      )}
                      <td className="py-2 pr-3 text-right text-emerald-700 font-semibold">
                        {r.missing_cost ? "—" : fmt(r.currency, r.total_profit)}
                      </td>
                    </tr>
                  );
                })}
                {initialReport.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={initialReport.isAdminView ? 12 : 11}
                      className="py-8 text-center text-muted-foreground text-sm"
                    >
                      Veri yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
