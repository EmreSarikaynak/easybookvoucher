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
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

const symbol = (c: string) =>
  c === "TRY" ? "₺" : c === "USD" ? "$" : c === "GBP" ? "£" : "€";

const fmt = (c: string, v: number) =>
  `${symbol(c)}${Math.abs(v).toLocaleString("tr-TR", {
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
  const totalsByCurrency = new Map<
    string,
    { debt: number; credit: number }
  >();
  for (const c of cards) {
    for (const l of c.lines) {
      const t = totalsByCurrency.get(l.currency) ?? { debt: 0, credit: 0 };
      if (l.net_debt > 0) t.debt += l.net_debt;
      else if (l.net_debt < 0) t.credit += -l.net_debt;
      totalsByCurrency.set(l.currency, t);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Acente Cari Hesap</h1>
        <p className="text-sm text-muted-foreground">
          Her acentenin EasyBook&apos;a borcu ve alacağı para birimi bazında.
          Kartlardan acente seçip detay listeyi açabilirsiniz.
        </p>
      </div>

      {/* Genel toplam — bütün acentelerin net borç/alacak toplamı, döviz bazlı */}
      {totalsByCurrency.size > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from(totalsByCurrency.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cur, t]) => {
              const net = t.debt - t.credit;
              const positive = net >= 0;
              return (
                <Card key={cur}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" /> Toplam ({cur})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p
                      className={`text-2xl font-bold ${
                        positive ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {fmt(cur, net)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {positive
                        ? "Acentelerden tahsil edilecek"
                        : "EasyBook borçlu"}
                    </p>
                    <div className="flex gap-4 pt-1 text-xs">
                      <span className="text-amber-700">
                        Alacak: <strong>{fmt(cur, t.debt)}</strong>
                      </span>
                      <span className="text-emerald-700">
                        Borç: <strong>{fmt(cur, t.credit)}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
            const totalDebt = c.lines.reduce(
              (s, l) => s + Math.max(0, l.net_debt),
              0
            );
            const totalCredit = c.lines.reduce(
              (s, l) => s + Math.max(0, -l.net_debt),
              0
            );
            const status: "debt" | "credit" | "settled" =
              totalDebt > 0
                ? "debt"
                : totalCredit > 0
                  ? "credit"
                  : "settled";
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

                    {/* Para birimi bazlı net bakiye */}
                    {c.lines.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Hareket yok.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {c.lines.map((l) => {
                          const positive = l.net_debt > 0;
                          const zero = l.net_debt === 0;
                          return (
                            <div
                              key={l.currency}
                              className="flex items-center justify-between text-sm tabular-nums"
                            >
                              <span className="text-muted-foreground text-xs">
                                {l.currency}
                              </span>
                              <span
                                className={`font-semibold ${
                                  zero
                                    ? "text-slate-600"
                                    : positive
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                }`}
                              >
                                {zero ? (
                                  fmt(l.currency, 0)
                                ) : (
                                  <>
                                    {positive ? "+" : "−"}
                                    {fmt(l.currency, l.net_debt)}
                                  </>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

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
