"use client";

import { MapPin, Clock } from "lucide-react";
import type { PickupZone } from "@/lib/types";

interface PickupZonesTableProps {
  zones?: PickupZone[] | null;
  /** Üstte gözükecek başlık — varsayılan: "Alış Bölgeleri" */
  title?: string;
  /** Alt bilgi notu — örn. "Saatler hava durumuna göre değişebilir" */
  note?: string;
  /** Stil varyantı: 'admin' (yoğun, gri tonlar) veya 'public' (havadar) */
  variant?: "admin" | "public";
}

/**
 * Bölgeye göre alış saati + buluşma noktası tablosu.
 *
 * Aynı buluşma noktasına sahip bölgeleri tek bir başlık altında gruplar
 * (örn. "Otel Önü" ve "Torba Kavşak Köprü Altı" iki ayrı tablo halinde
 * gözükür). Rafting gibi çoğu noktadan transfer yapan turlar için.
 *
 * `zones` boş/null ise hiçbir şey render etmez (caller'ın kontrolü gerekmez).
 */
export function PickupZonesTable({
  zones,
  title = "Alış Bölgeleri",
  note = "Saatler hava durumu ve yoğunluğa göre değişebilir.",
  variant = "admin",
}: PickupZonesTableProps) {
  const clean = (zones ?? []).filter(
    (z) => z?.region?.trim() || z?.time?.trim() || z?.meeting_point?.trim()
  );
  if (clean.length === 0) return null;

  // Aynı meeting_point'e göre grupla; sıra dahil olma sırası
  const order: string[] = [];
  const groups = new Map<string, PickupZone[]>();
  for (const z of clean) {
    const key = (z.meeting_point ?? "").trim() || "—";
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(z);
  }

  const wrapperBg =
    variant === "public" ? "bg-white" : "bg-muted/20 dark:bg-zinc-900/40";
  const headerBg =
    variant === "public" ? "bg-slate-900 text-white" : "bg-slate-800 text-white";
  const borderColor =
    variant === "public" ? "border-slate-200" : "border-zinc-200 dark:border-zinc-800";

  return (
    <section className={`rounded-lg border ${borderColor} ${wrapperBg} overflow-hidden`}>
      <header className={`px-4 py-2.5 ${headerBg} flex items-center gap-2`}>
        <MapPin className="h-4 w-4" />
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      </header>

      <div className="divide-y divide-slate-200 dark:divide-zinc-800">
        {order.map((meetingPoint) => {
          const items = groups.get(meetingPoint)!;
          return (
            <div key={meetingPoint} className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Buluşma Yeri: <span className="text-emerald-700">{meetingPoint}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left bg-slate-50 dark:bg-zinc-900/60">
                      <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800">
                        Bölge
                      </th>
                      <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 w-[110px]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pick Up
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((z, i) => (
                      <tr key={`${z.region}-${i}`} className="even:bg-slate-50/60 dark:even:bg-zinc-900/30">
                        <td className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 font-medium text-slate-800 dark:text-slate-100">
                          {z.region || "—"}
                        </td>
                        <td className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 font-bold text-slate-900 dark:text-white">
                          {z.time || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {note && (
        <footer className="px-4 py-2 text-[11px] text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900">
          NOT: {note}
        </footer>
      )}
    </section>
  );
}
