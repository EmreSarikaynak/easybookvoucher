import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { fetchAgencyCari, type CariVoucherRow } from "@/app/actions/cari";
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
import {
  CariPaymentRecorder,
  CariPaymentDeleteButton,
} from "./cari-payment-form";
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Net Bakiye (EUR)
            </CardTitle>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
                status === "debt"
                  ? "bg-amber-50 text-amber-800"
                  : status === "credit"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-50 text-slate-700"
              }`}
            >
              {status === "debt" ? (
                <>
                  <AlertTriangle className="h-3 w-3" /> Acente borçlu
                </>
              ) : status === "credit" ? (
                <>
                  <Wallet className="h-3 w-3" /> EasyBook borçlu
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Hesap eşit
                </>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">EasyBook Alacak</p>
              <p className="text-xl font-bold text-amber-700 tabular-nums">
                {fmtEur(eur.cost_total_eur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acentenin Ödediği</p>
              <p className="text-xl font-bold text-emerald-700 tabular-nums">
                {fmtEur(eur.payments_total_eur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Bakiye</p>
              <p
                className={`text-2xl font-bold tabular-nums ${
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
          <p className="text-xs text-muted-foreground">
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
                    <th className="py-2 pr-3 font-medium text-right text-amber-700">
                      EasyBook Alacak
                    </th>
                    <th className="py-2 pr-3 font-medium text-right text-emerald-700">
                      Acentenin Ödediği
                    </th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Net (Bilet kuru)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.lines.map((l) => {
                    const positive = l.net_debt > 0;
                    const zero = l.net_debt === 0;
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
                        <td className="py-2 pr-3 text-right text-amber-700 tabular-nums">
                          {fmt(l.currency, l.cost_total)}
                        </td>
                        <td className="py-2 pr-3 text-right text-emerald-700 tabular-nums">
                          {fmt(l.currency, l.payments_total)}
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
              Bakiye hesabı yukarıdaki EUR konsolide görünümden yapılır.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Aktif biletler */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Aktif Biletler (
            {data.active_vouchers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VoucherList rows={data.active_vouchers} />
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
            <VoucherList rows={data.cancelled_vouchers} cancelled />
          </CardContent>
        </Card>
      )}

      {/* Ödemeler */}
      {adminView && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Acentenin Yaptığı Ödemeler (
              {data.payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Henüz ödeme kaydı yok.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground sticky top-0 bg-background">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Tarih</th>
                      <th className="py-2 pr-3 font-medium text-right">
                        Tutar
                      </th>
                      <th className="py-2 pr-3 font-medium text-right">
                        EUR Karşılığı
                      </th>
                      <th className="py-2 pr-3 font-medium">İlgili Bilet</th>
                      <th className="py-2 pr-3 font-medium">Not</th>
                      <th className="py-2 pr-3 font-medium w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 text-xs">
                          {fmtDate(p.payment_date)}
                        </td>
                        <td className="py-2 pr-3 text-right text-emerald-700 font-semibold tabular-nums">
                          {fmt(p.currency, p.amount)}{" "}
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {p.currency}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {p.amount_eur != null ? (
                            <span className="text-emerald-700 font-medium">
                              {fmtEur(p.amount_eur)}
                            </span>
                          ) : (
                            <span className="text-amber-700 text-[11px]">
                              kur eksik
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {p.related_voucher_no ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-xs">{p.notes ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">
                          <CariPaymentDeleteButton
                            paymentId={p.id}
                            agencyId={data.agency_id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface VoucherListProps {
  rows: CariVoucherRow[];
  cancelled?: boolean;
}

function VoucherList({ rows, cancelled }: VoucherListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Kayıt yok.</p>
    );
  }
  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground sticky top-0 bg-background z-10">
          <tr>
            <th className="py-2 pr-3 font-medium">Tarih</th>
            <th className="py-2 pr-3 font-medium">Bilet</th>
            <th className="py-2 pr-3 font-medium">Müşteri / Tur</th>
            <th className="py-2 pr-3 font-medium">PAX</th>
            <th className="py-2 pr-3 font-medium text-right text-amber-700">
              EasyBook Alacak
            </th>
            <th className="py-2 pr-3 font-medium text-right">
              EUR Karşılığı
            </th>
            <th className="py-2 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr
              key={r.voucher_id}
              className={`hover:bg-muted/30 ${cancelled ? "opacity-60" : ""}`}
            >
              <td className="py-2 pr-3 text-xs whitespace-nowrap">
                {fmtDate(r.tour_date)}
              </td>
              <td className="py-2 pr-3 font-mono text-xs">
                <Link
                  href={`/vouchers/${r.voucher_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {r.voucher_no}
                </Link>
              </td>
              <td className="py-2 pr-3">
                <div className="text-sm truncate max-w-[200px]">
                  {r.customer_name}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {r.tour_name}
                </div>
              </td>
              <td className="py-2 pr-3 text-xs whitespace-nowrap">
                {r.pax_adult}Y
                {r.pax_child > 0 ? ` + ${r.pax_child}Ç` : ""}
                {r.pax_infant > 0 ? ` + ${r.pax_infant}B` : ""}
              </td>
              <td className="py-2 pr-3 text-right text-amber-700 font-semibold tabular-nums">
                {r.missing_cost ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="h-3 w-3" /> maliyet eksik
                  </span>
                ) : (
                  <>
                    {fmt(r.currency, r.easybook_cost)}{" "}
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {r.currency}
                    </span>
                  </>
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {r.missing_cost ? (
                  <span className="text-muted-foreground text-[11px]">—</span>
                ) : r.easybook_cost_eur != null ? (
                  <span
                    className="text-amber-700 font-medium"
                    title={
                      r.eur_rate_snapshot
                        ? `1 ${r.currency} = ${Number(r.eur_rate_snapshot).toFixed(4)} EUR (${r.eur_rate_date ?? "—"})`
                        : undefined
                    }
                  >
                    {fmtEur(r.easybook_cost_eur)}
                  </span>
                ) : (
                  <span className="text-amber-700 text-[11px]">kur eksik</span>
                )}
              </td>
              <td className="py-2 pr-3">
                {r.source === "public_qr" && (
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[11px]">
                    QR
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
