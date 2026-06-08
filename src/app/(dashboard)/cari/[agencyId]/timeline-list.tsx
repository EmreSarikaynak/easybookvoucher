"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, CheckCircle2, Search } from "lucide-react";
import type { CariVoucherRow, CariAgentPaymentRow } from "@/app/actions/cari";

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

type TimelineItem =
  | { kind: "voucher"; date: string; data: CariVoucherRow }
  | { kind: "payment"; date: string; data: CariAgentPaymentRow };

interface TimelineListProps {
  vouchers: CariVoucherRow[];
  payments: CariAgentPaymentRow[];
  adminView: boolean;
  agencyId: string;
}

const PAGE_SIZE = 30;

type SortKey = "date" | "customer" | "tour" | "price" | "cost";

export function TimelineList({ vouchers, payments, adminView, agencyId }: TimelineListProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const timeline = useMemo<TimelineItem[]>(() => {
    const q = search.trim().toLowerCase();

    const filteredVouchers = q
      ? vouchers.filter(
          (v) =>
            v.customer_name?.toLowerCase().includes(q) ||
            v.voucher_no?.toLowerCase().includes(q) ||
            v.tour_name?.toLowerCase().includes(q)
        )
      : vouchers;

    const items: TimelineItem[] = [
      ...filteredVouchers.map((v) => ({ kind: "voucher" as const, date: v.tour_date, data: v })),
      // Ödemeler aramadan bağımsız — her zaman göster
      ...payments.map((p) => ({ kind: "payment" as const, date: p.payment_date, data: p })),
    ];

    return items.sort((a, b) => {
      // Her zaman önce tarih bazlı sıralanır (ödeme/bilet karışık)
      // Sütun sıralaması biletler için geçerli; ödemeler tarihe göre kalır
      if (a.kind === "payment" && b.kind === "payment") {
        return b.date.localeCompare(a.date);
      }
      if (a.kind === "payment" || b.kind === "payment") {
        // Ödeme ile bilet karşılaştırılıyorsa tarih bazlı
        const dir = b.date.localeCompare(a.date);
        if (dir !== 0) return dir;
        return a.kind === "payment" ? 1 : -1;
      }
      // İki bilet karşılaştırması — seçili sıralamaya göre
      const av = a.data as CariVoucherRow;
      const bv = b.data as CariVoucherRow;
      let cmp = 0;
      if (sortKey === "date")     cmp = av.tour_date.localeCompare(bv.tour_date);
      if (sortKey === "customer") cmp = av.customer_name.localeCompare(bv.customer_name);
      if (sortKey === "tour")     cmp = av.tour_name.localeCompare(bv.tour_name);
      if (sortKey === "price")    cmp = av.total_price - bv.total_price;
      if (sortKey === "cost")     cmp = (av.easybook_cost_eur ?? 0) - (bv.easybook_cost_eur ?? 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [vouchers, payments, search, sortKey, sortAsc]);

  // İlk ödeme satırının index'ini bul — ondan sonraki biletler "ödenmiş"
  const firstPaymentIndex = timeline.findIndex((i) => i.kind === "payment");
  const hasPaidBoundary = firstPaymentIndex !== -1;

  const visible = timeline.slice(0, shown);
  const hasMore = shown < timeline.length;

  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Kayıt yok.</p>;
  }

  const SortTh = ({ label, col, className }: { label: string; col: SortKey; className?: string }) => (
    <th className={`py-2 pr-3 font-medium select-none ${className ?? ""}`}>
      <button
        onClick={() => { toggleSort(col); setShown(PAGE_SIZE); }}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === col ? "opacity-100" : "opacity-30"}`} />
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Arama kutusu */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Müşteri adı, bilet no veya tur adı ile ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE_SIZE); }}
          className="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground sticky top-0 bg-background z-10">
          <tr>
            <SortTh label="Tarih" col="date" />
            <th className="py-2 pr-3 font-medium">Bilet</th>
            <SortTh label="Müşteri / Tur" col="customer" />
            <th className="py-2 pr-3 font-medium">PAX</th>
            <SortTh label="Satış Fiyatı" col="price" className="text-right text-slate-600" />
            <SortTh label="EasyBook Alacak" col="cost" className="text-right text-amber-700" />
            <th className="py-2 pr-3 font-medium text-right">EUR Karşılığı</th>
            <th className="py-2 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {visible.map((item, i) => {
            // Ödeme satırının altında (daha eski tarihli) kalan biletler ödenmiş
            const isPaid = hasPaidBoundary && i > firstPaymentIndex && item.kind === "voucher";
            const isUnpaid = hasPaidBoundary && i < firstPaymentIndex && item.kind === "voucher";

            if (item.kind === "payment") {
              const p = item.data;
              return (
                <tr
                  key={`payment-${p.id}`}
                  className="bg-emerald-50 border-l-4 border-emerald-400"
                >
                  <td className="py-2 pr-3 text-xs whitespace-nowrap text-emerald-700">
                    {fmtDate(p.payment_date)}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Ödeme
                    </span>
                  </td>
                  <td className="py-2 pr-3" colSpan={2}>
                    <div className="text-sm font-semibold text-emerald-800">
                      EasyBook Ödeme Aldı
                    </div>
                    {p.notes && (
                      <div className="text-xs text-emerald-700 truncate max-w-[280px]">
                        {p.notes}
                      </div>
                    )}
                    {p.related_voucher_no && (
                      <div className="text-[11px] text-muted-foreground">
                        Bilet: {p.related_voucher_no}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span className="text-emerald-700 font-bold tabular-nums">
                      {fmt(p.currency, p.amount)}{" "}
                      <span className="text-[11px] font-normal">{p.currency}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-emerald-700 font-bold tabular-nums" colSpan={2}>
                    {p.amount_eur != null ? fmtEur(p.amount_eur) : (
                      <span className="text-amber-600 text-[11px] font-normal">kur eksik</span>
                    )}
                  </td>
                </tr>
              );
            }

            const r = item.data;
            return (
              <tr
                key={`voucher-${r.voucher_id}-${i}`}
                className={
                  isPaid
                    ? "bg-emerald-50/50 border-l-4 border-emerald-300 hover:bg-emerald-50"
                    : isUnpaid
                      ? "bg-red-50/50 border-l-4 border-red-300 hover:bg-red-50"
                      : "hover:bg-muted/30"
                }
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
                  <div className="text-sm truncate max-w-[200px]">{r.customer_name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.tour_name}
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs whitespace-nowrap">
                  {r.pax_adult}Y
                  {r.pax_child > 0 ? ` + ${r.pax_child}Ç` : ""}
                  {r.pax_infant > 0 ? ` + ${r.pax_infant}B` : ""}
                </td>
                <td className="py-2 pr-3 text-right text-slate-700 font-semibold tabular-nums">
                  {fmt(r.currency, r.total_price)}{" "}
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {r.currency}
                  </span>
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
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <div className="pt-3 text-center">
          <button
            onClick={() => setShown((s) => s + PAGE_SIZE)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Daha fazla göster ({timeline.length - shown} kayıt daha)
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
