import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { fetchAgencyCari } from "@/app/actions/cari";
import { TimelineList } from "./timeline-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { CariPaymentRecorder } from "./cari-payment-form";
import type { CurrencyType } from "@/lib/types";

export const dynamic = "force-dynamic";

const symbol = (c: string) =>
  c === "TRY" ? "₺" : c === "USD" ? "$" : c === "GBP" ? "£" : "€";

const fmt = (c: string, v: number) =>
  `${symbol(c)}${Math.abs(v).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const fmtEur = (v: number) =>
  `€${Math.abs(v).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

interface PageProps {
  params: Promise<{ agencyId: string }>;
}

export default async function AgencyCariPage({ params }: PageProps) {
  const { agencyId } = await params;
  const profile = await getCurrentUser();
  if (!profile) redirect("/");

  const adminView = isAdmin(profile);
  if (!adminView && profile.agency_id !== agencyId) {
    redirect("/dashboard");
  }

  const { data, error } = await fetchAgencyCari(agencyId);
  if (error || !data) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error ?? "Veri yok"}
      </div>
    );
  }

  // Birincil görünüm: konsolide EUR bakiye.
  const eur = data.eur;
  const status: "debt" | "credit" | "settled" =
    eur.net_debt_eur > 0 ? "debt" : eur.net_debt_eur < 0 ? "credit" : "settled";

  // Ödeme diyaloğu için varsayılan currency — en yüksek borçlu para birimi.
  const dominantCurrency: CurrencyType =
    (data.lines
      .slice()
      .sort((a, b) => b.net_debt - a.net_debt)[0]?.currency as CurrencyType) ??
    "EUR";

  const missingCostTotal = data.lines.reduce(
    (s, l) => s + l.missing_cost_count,
    0
  );

  const missingEur =
    eur.voucher_count_missing_eur + eur.payment_count_missing_eur;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          {adminView && (
            <Link
              href="/cari"
              className="text-muted-foreground hover:text-foreground p-1 -ml-1"
              aria-label="Geri"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {data.agency_name}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              {data.agency_code ?? "—"}
            </p>
          </div>
        </div>
        {adminView && (
          <CariPaymentRecorder
            agencyId={data.agency_id}
            defaultCurrency={dominantCurrency}
          />
        )}
      </div>

      {/* Birincil bakiye — EUR konsolide */}
      <Card
        className={
          status === "debt"
            ? "border-amber-300"
            : status === "credit"
              ? "border-emerald-300"
              : ""
        }
      >
        {/* Hero: net durum — tek bakışta */}
        <div
          className={`rounded-t-xl px-6 py-5 ${
            status === "debt"
              ? "bg-amber-50 border-b border-amber-200"
              : status === "credit"
                ? "bg-emerald-50 border-b border-emerald-200"
                : "bg-slate-50 border-b border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {status === "debt" ? (
                <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
              ) : status === "credit" ? (
                <Wallet className="h-7 w-7 text-emerald-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-slate-500 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${
                  status === "debt" ? "text-amber-800" : status === "credit" ? "text-emerald-800" : "text-slate-700"
                }`}>
                  {status === "debt"
                    ? "Acente EasyBook'a borçlu"
                    : status === "credit"
                      ? "EasyBook acenteye borçlu"
                      : "Hesap eşit"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">EUR cinsinden konsolide bakiye</p>
              </div>
            </div>
            <p
              className={`text-4xl font-extrabold tabular-nums ${
                status === "settled"
                  ? "text-slate-600"
                  : status === "debt"
                    ? "text-amber-700"
                    : "text-emerald-700"
              }`}
            >
              {status === "settled"
                ? fmtEur(0)
                : `${status === "debt" ? "+" : "−"}${fmtEur(eur.net_debt_eur)}`}
            </p>
          </div>
        </div>

        <CardContent className="space-y-3 pt-4">
          {/* 4 metrik */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">EasyBook Alacak</p>
              <p className="text-lg font-bold text-amber-700 tabular-nums">
                {fmtEur(eur.cost_total_eur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acentenin Ödediği</p>
              <p className="text-lg font-bold text-emerald-700 tabular-nums">
                {fmtEur(eur.payments_total_eur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Satış</p>
              <p className="text-lg font-bold text-slate-700 tabular-nums">
                {fmtEur(eur.sales_total_eur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acente Karı</p>
              <p className={`text-lg font-bold tabular-nums ${eur.agency_profit_eur >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {eur.agency_profit_eur >= 0 ? "+" : "−"}{fmtEur(eur.agency_profit_eur)}
              </p>
              <p className="text-[10px] text-muted-foreground">Satış − maliyet</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t pt-3">
            Bilet ve ödemeler kayıt anındaki TCMB kuru ile EUR&apos;ya
            kilitlenir. Bilet kendi para biriminde verilmeye devam eder; cari
            hesap her zaman EUR cinsinden gösterilir.
          </p>
          {missingCostTotal > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{missingCostTotal} bilet</strong> için EasyBook maliyeti
                tanımlı değil (turun taban fiyatı yok). Bakiyeye dahil
                edilmediler.
              </span>
            </div>
          )}
          {missingEur > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{missingEur} kayıt</strong> için EUR snapshot eksik (o
                tarihte kur yoktu). Bakiyeye dahil edilmediler — Döviz Kurları
                sayfasından senkron yaptıktan sonra otomatik tamamlanırlar.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Para birimi bazlı detay (referans) */}
      {data.lines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Para birimi bazlı detay (referans)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Para</th>
                    <th className="py-2 pr-3 font-medium">Bilet</th>
                    <th className="py-2 pr-3 font-medium text-right text-slate-600">
                      Toplam Satış
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-amber-700">
                      EasyBook Alacak
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-emerald-700">
                      Acente Ödediği
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-blue-700">
                      Acente Karı
                    </th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Net Borç
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.lines.map((l) => {
                    const positive = l.net_debt > 0;
                    const zero = l.net_debt === 0;
                    const profitPositive = l.agency_profit >= 0;
                    return (
                      <tr key={l.currency}>
                        <td className="py-2 pr-3 font-medium">{l.currency}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {l.voucher_count}
                          {l.missing_cost_count > 0 && (
                            <span className="ml-1 text-[11px] text-amber-700">
                              ({l.missing_cost_count} maliyet eksik)
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-700 tabular-nums">
                          {fmt(l.currency, l.sales_total)}
                        </td>
                        <td className="py-2 pr-3 text-right text-amber-700 tabular-nums">
                          {fmt(l.currency, l.cost_total)}
                        </td>
                        <td className="py-2 pr-3 text-right text-emerald-700 tabular-nums">
                          {fmt(l.currency, l.payments_total)}
                        </td>
                        <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${profitPositive ? "text-blue-700" : "text-red-700"}`}>
                          {profitPositive ? "+" : "−"}{fmt(l.currency, l.agency_profit)}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right font-semibold tabular-nums ${
                            zero
                              ? "text-slate-600"
                              : positive
                                ? "text-amber-700"
                                : "text-emerald-700"
                          }`}
                        >
                          {zero
                            ? fmt(l.currency, 0)
                            : `${positive ? "+" : "−"}${fmt(l.currency, l.net_debt)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Bu tablo bilet para birimi cinsinden ham toplamları gösterir.
              Net Borç sütunu her para biriminin kendi bakiyesini yansıtır —
              ödeme hangi para biriminde yapıldıysa o satırda görünür.
              Genel netleşme için yukarıdaki EUR konsolide özeti kullanın.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Aktif biletler + ödemeler zaman çizelgesi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Biletler &amp; Ödemeler (
            {data.active_vouchers.length + data.payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineList
            vouchers={data.active_vouchers}
            payments={adminView ? data.payments : []}
            adminView={adminView}
            agencyId={data.agency_id}
          />
        </CardContent>
      </Card>

      {/* İptal biletler */}
      {data.cancelled_vouchers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Ban className="h-4 w-4" /> İptal Edilen Biletler (
              {data.cancelled_vouchers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineList
              vouchers={data.cancelled_vouchers}
              payments={[]}
              adminView={false}
              agencyId={data.agency_id}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
