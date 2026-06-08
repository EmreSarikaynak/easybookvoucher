import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { fetchCariOverview } from "@/app/actions/cari";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

const fmtEur = (v: number) =>
  `€${Math.abs(v).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export default async function CariLandingPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/");

  // Acente kullanıcı: doğrudan kendi sayfasına yönlendir.
  if (!isAdmin(profile)) {
    if (!profile.agency_id) {
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Acente kaydınız bulunmuyor.
        </div>
      );
    }
    redirect(`/cari/${profile.agency_id}`);
  }

  const { data, error } = await fetchCariOverview();
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const cards = data ?? [];

  // Konsolide EUR toplamı — tüm acentelerin EUR net bakiyesi.
  let totalDebtEur = 0;
  let totalCreditEur = 0;
  let totalSalesEur = 0;
  let totalAgencyProfitEur = 0;
  let missingEurCount = 0;
  for (const c of cards) {
    if (c.eur.net_debt_eur > 0) totalDebtEur += c.eur.net_debt_eur;
    else if (c.eur.net_debt_eur < 0) totalCreditEur += -c.eur.net_debt_eur;
    totalSalesEur += c.eur.sales_total_eur;
    totalAgencyProfitEur += c.eur.agency_profit_eur;
    missingEurCount +=
      c.eur.voucher_count_missing_eur + c.eur.payment_count_missing_eur;
  }
  const netTotalEur = totalDebtEur - totalCreditEur;
  const netPositive = netTotalEur >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Acente Cari Hesap</h1>
        <p className="text-sm text-muted-foreground">
          Tüm cari bakiyeler EUR cinsinden konsolide gösterilir. Bilet
          oluşturulduğu/ödendiği günkü TCMB kuru ile EUR&apos;ya kilitlenir,
          sonradan kurlar değişse de bakiye kaymaz.
        </p>
      </div>

      {/* Genel toplam — konsolide EUR */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> Net Bakiye (EUR)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className={`text-2xl font-bold ${
                netPositive ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {netPositive ? "+" : "−"}
              {fmtEur(netTotalEur)}
            </p>
            <p className="text-xs text-muted-foreground">
              {netPositive
                ? "Acentelerden tahsil edilecek (net)"
                : "EasyBook acentelere borçlu (net)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Toplam Alacak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{fmtEur(totalDebtEur)}</p>
            <p className="text-xs text-muted-foreground">EasyBook → Acente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Toplam Borç
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">{fmtEur(totalCreditEur)}</p>
            <p className="text-xs text-muted-foreground">Acente → EasyBook (fazla ödeme)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Toplam Satış
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-700">{fmtEur(totalSalesEur)}</p>
            <p className="text-xs text-muted-foreground">
              Acente karı:{" "}
              <span className={totalAgencyProfitEur >= 0 ? "text-blue-700 font-medium" : "text-red-700 font-medium"}>
                {totalAgencyProfitEur >= 0 ? "+" : "−"}{fmtEur(totalAgencyProfitEur)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {missingEurCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>{missingEurCount}</strong> kayıt için EUR snapshot eksik
            (kur henüz tanımsız). Bu kayıtlar bakiye toplamına dahil edilmedi;
            Döviz Kurları sayfasından TCMB senkronu yaptıktan sonra otomatik
            doldurulurlar.
          </span>
        </div>
      )}

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Henüz kayıtlı acente yok.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const net = c.eur.net_debt_eur;
            const status: "debt" | "credit" | "settled" =
              net > 0 ? "debt" : net < 0 ? "credit" : "settled";
            const missingCost = c.lines.reduce(
              (s, l) => s + l.missing_cost_count,
              0
            );

            return (
              <Link
                key={c.agency_id}
                href={`/cari/${c.agency_id}`}
                className="block group"
              >
                <Card
                  className={`h-full transition-shadow hover:shadow-md ${
                    status === "debt"
                      ? "border-amber-300"
                      : status === "credit"
                        ? "border-emerald-300"
                        : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{c.agency_name}</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {c.agency_code ?? "—"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Durum şeridi */}
                    <div
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                        status === "debt"
                          ? "bg-amber-50 text-amber-800"
                          : status === "credit"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {status === "debt" ? (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Acente borçlu</span>
                        </>
                      ) : status === "credit" ? (
                        <>
                          <Wallet className="h-3.5 w-3.5" />
                          <span>EasyBook borçlu</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hesap eşit</span>
                        </>
                      )}
                    </div>

                    {/* EUR net bakiye — büyük, birincil */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">
                        Net Bakiye
                      </span>
                      <span
                        className={`text-xl font-bold tabular-nums ${
                          status === "settled"
                            ? "text-slate-600"
                            : status === "debt"
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }`}
                      >
                        {status === "settled" ? (
                          fmtEur(0)
                        ) : (
                          <>
                            {status === "debt" ? "+" : "−"}
                            {fmtEur(net)}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Alt bilgiler */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                      <div className="flex items-center justify-between">
                        <span>Alacak:</span>
                        <span className="font-medium text-amber-700">
                          {fmtEur(c.eur.cost_total_eur)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tahsil:</span>
                        <span className="font-medium text-emerald-700">
                          {fmtEur(c.eur.payments_total_eur)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Toplam Satış:</span>
                        <span className="font-medium text-slate-700">
                          {fmtEur(c.eur.sales_total_eur)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Acente Karı:</span>
                        <span className={`font-medium ${c.eur.agency_profit_eur >= 0 ? "text-blue-700" : "text-red-700"}`}>
                          {c.eur.agency_profit_eur >= 0 ? "+" : "−"}{fmtEur(c.eur.agency_profit_eur)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground border-t pt-2">
                      <span>Aktif bilet: {c.voucher_count_active}</span>
                      {c.voucher_count_cancelled > 0 && (
                        <span>İptal: {c.voucher_count_cancelled}</span>
                      )}
                      {missingCost > 0 && (
                        <span className="text-amber-700">
                          Maliyet eksik: {missingCost}
                        </span>
                      )}
                      {(c.eur.voucher_count_missing_eur > 0 ||
                        c.eur.payment_count_missing_eur > 0) && (
                        <span className="text-amber-700">
                          Kur eksik:{" "}
                          {c.eur.voucher_count_missing_eur +
                            c.eur.payment_count_missing_eur}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
