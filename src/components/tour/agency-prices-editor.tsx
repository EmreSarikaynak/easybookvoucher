"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Save, Clock, Calendar, Info, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOwnAgencyPrices } from "@/app/actions/agency-tour-prices";
import { formatTurkishDays, formatDepartureTime } from "@/lib/tour-days";

export interface AgencyPriceRow {
  tour_id: string;
  tour_name: string;
  departure_days: string[] | null;
  departure_time: string | null;
  cost_adult_eur: number;
  cost_child_eur: number;
  cost_adult_try: number;
  cost_child_try: number;
  sale_adult_eur: number;
  sale_child_eur: number;
  sale_adult_try: number;
  sale_child_try: number;
}

type SaleField =
  | "sale_adult_eur"
  | "sale_child_eur"
  | "sale_adult_try"
  | "sale_child_try";

interface Props {
  rows: AgencyPriceRow[];
}

export function AgencyPricesEditor({ rows: initialRows }: Props) {
  const [rows, setRows] = useState<AgencyPriceRow[]>(initialRows);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (t: { type: "success" | "error"; text: string }) => {
      setToast(t);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    },
    []
  );

  const save = useCallback(
    (auto: boolean) => {
      const payload = rowsRef.current.map((r) => ({
        tour_id: r.tour_id,
        price_adult_eur: r.sale_adult_eur,
        price_child_eur: r.sale_child_eur,
        price_adult_try: r.sale_adult_try,
        price_child_try: r.sale_child_try,
      }));

      startTransition(async () => {
        const result = await saveOwnAgencyPrices(payload);
        if (result.error) {
          setMessage({ type: "error", text: result.error });
          showToast({ type: "error", text: result.error });
        } else {
          setMessage({ type: "success", text: "Satış fiyatlarınız kaydedildi." });
          setDirty(false);
          showToast({
            type: "success",
            text: auto ? "Fiyatlar otomatik güncellendi" : "Satış fiyatlarınız kaydedildi",
          });
        }
      });
    },
    [showToast]
  );

  const update = (tourId: string, field: SaleField, value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.tour_id === tourId ? { ...r, [field]: value } : r))
    );
    setDirty(true);
    setMessage(null);

    // Otomatik kayıt — yazma durunca 1sn sonra kaydet
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(true), 1000);
  };

  const handleSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground shadow-sm">
        Henüz aktif tur bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Yönetici fiyatı</strong> — yönetici tarafından belirlenen varsayılan tutar, değiştirilemez.
          <strong> Satış fiyatı</strong> alanına kendi satış fiyatınızı girin.
          Kaydettiğiniz satış fiyatları{" "}
          <strong>Tur Kataloğu, PDF ve bilet formunda</strong> otomatik olarak kullanılır.
          Fiyat girilmemiş turlar katalogda ve bilet formunda <strong>boş</strong> görünür.
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Üst başlık satırı — para birimi grupları */}
            <tr className="border-b text-xs uppercase tracking-wider">
              <th
                rowSpan={2}
                className="py-3 px-4 text-left font-semibold align-bottom bg-muted/40 border-r"
              >
                Tur
              </th>
              <th
                colSpan={3}
                className="py-2 px-3 text-center font-bold text-blue-800 bg-blue-50 border-r-2 border-white"
              >
                EUR (€)
              </th>
              <th
                colSpan={3}
                className="py-2 px-3 text-center font-bold text-amber-800 bg-amber-50"
              >
                TRY (₺)
              </th>
            </tr>
            {/* Alt başlık satırı — Yönetici / Yetişkin / Çocuk */}
            <tr className="border-b text-[11px] font-medium text-muted-foreground">
              <th className="py-2 px-3 text-right bg-blue-50/60 font-semibold">
                Yönetici<br />
                <span className="font-normal">(Yet / Çoc)</span>
              </th>
              <th className="py-2 px-3 text-right bg-blue-50/60 font-semibold">
                Satış<br />
                <span className="font-normal">Yetişkin</span>
              </th>
              <th className="py-2 px-3 text-right bg-blue-50/60 font-semibold border-r-2 border-white">
                Satış<br />
                <span className="font-normal">Çocuk</span>
              </th>
              <th className="py-2 px-3 text-right bg-amber-50/60 font-semibold">
                Yönetici<br />
                <span className="font-normal">(Yet / Çoc)</span>
              </th>
              <th className="py-2 px-3 text-right bg-amber-50/60 font-semibold">
                Satış<br />
                <span className="font-normal">Yetişkin</span>
              </th>
              <th className="py-2 px-3 text-right bg-amber-50/60 font-semibold">
                Satış<br />
                <span className="font-normal">Çocuk</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const days = formatTurkishDays(r.departure_days);
              const time = formatDepartureTime(r.departure_time);
              return (
                <tr key={r.tour_id} className="border-b last:border-0 hover:bg-muted/10">
                  <td className="py-3 px-4 border-r bg-muted/10">
                    <div className="font-medium">{r.tour_name}</div>
                    {(days || time) && (
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {days && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {days}
                          </span>
                        )}
                        {time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  {/* EUR grup */}
                  <td className="py-2.5 px-3 text-right font-mono text-blue-700 bg-blue-50/20">
                    {r.cost_adult_eur} € <span className="text-muted-foreground">/</span>{" "}
                    {r.cost_child_eur} €
                  </td>
                  <td className="py-2.5 px-3 bg-blue-50/20">
                    <NumberCell
                      value={r.sale_adult_eur}
                      onChange={(v) => update(r.tour_id, "sale_adult_eur", v)}
                      suffix="€"
                    />
                  </td>
                  <td className="py-2.5 px-3 bg-blue-50/20 border-r-2 border-white">
                    <NumberCell
                      value={r.sale_child_eur}
                      onChange={(v) => update(r.tour_id, "sale_child_eur", v)}
                      suffix="€"
                    />
                  </td>
                  {/* TRY grup */}
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 bg-amber-50/20">
                    {r.cost_adult_try} ₺ <span className="text-muted-foreground">/</span>{" "}
                    {r.cost_child_try} ₺
                  </td>
                  <td className="py-2.5 px-3 bg-amber-50/20">
                    <NumberCell
                      value={r.sale_adult_try}
                      onChange={(v) => update(r.tour_id, "sale_adult_try", v)}
                      suffix="₺"
                    />
                  </td>
                  <td className="py-2.5 px-3 bg-amber-50/20">
                    <NumberCell
                      value={r.sale_child_try}
                      onChange={(v) => update(r.tour_id, "sale_child_try", v)}
                      suffix="₺"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards: EUR solda, TRY sağda */}
      <div className="lg:hidden space-y-3">
        {rows.map((r) => {
          const days = formatTurkishDays(r.departure_days);
          const time = formatDepartureTime(r.departure_time);
          return (
            <div
              key={r.tour_id}
              className="rounded-lg border bg-white p-4 shadow-sm space-y-3"
            >
              <div>
                <div className="font-semibold">{r.tour_name}</div>
                {(days || time) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {days && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {days}
                      </span>
                    )}
                    {time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {time}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* EUR sütunu */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    EUR (€)
                  </div>
                  <CostMiniRow
                    label="Yön. Fiyatı (Yet/Çoc)"
                    text={`${r.cost_adult_eur} € / ${r.cost_child_eur} €`}
                  />
                  <LabeledInput
                    label="Satış — Yet"
                    value={r.sale_adult_eur}
                    onChange={(v) => update(r.tour_id, "sale_adult_eur", v)}
                    suffix="€"
                  />
                  <LabeledInput
                    label="Satış — Çoc"
                    value={r.sale_child_eur}
                    onChange={(v) => update(r.tour_id, "sale_child_eur", v)}
                    suffix="€"
                  />
                </div>

                {/* TRY sütunu */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    TRY (₺)
                  </div>
                  <CostMiniRow
                    label="Yön. Fiyatı (Yet/Çoc)"
                    text={`${r.cost_adult_try} ₺ / ${r.cost_child_try} ₺`}
                  />
                  <LabeledInput
                    label="Satış — Yet"
                    value={r.sale_adult_try}
                    onChange={(v) => update(r.tour_id, "sale_adult_try", v)}
                    suffix="₺"
                  />
                  <LabeledInput
                    label="Satış — Çoc"
                    value={r.sale_child_try}
                    onChange={(v) => update(r.tour_id, "sale_child_try", v)}
                    suffix="₺"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer save bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between border-t bg-white px-4 py-3 sm:mx-0 sm:rounded-lg sm:border">
        <div className="text-sm">
          {pending ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Kaydediliyor...
            </span>
          ) : message ? (
            <span
              className={
                message.type === "success" ? "text-emerald-700" : "text-red-700"
              }
            >
              {message.text}
            </span>
          ) : dirty ? (
            <span className="text-muted-foreground">Kaydedilmemiş değişiklikler var</span>
          ) : (
            <span className="text-muted-foreground">Değişiklikler otomatik kaydedilir</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={pending || !dirty}>
          <Save className="mr-2 h-4 w-4" />
          {pending ? "Kaydediliyor..." : "Satış Fiyatlarımı Kaydet"}
        </Button>
      </div>

      {/* Sağ-alt bildirim popup'ı */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Info className="h-5 w-5 shrink-0 text-red-600" />
            )}
            <span className="text-sm font-medium">{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        min={0}
        step={1}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-right font-mono"
        placeholder="0"
      />
      <span className="text-xs text-muted-foreground w-3">{suffix}</span>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          step={1}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="font-mono"
          placeholder="0"
        />
        <span className="text-xs text-muted-foreground w-3">{suffix}</span>
      </div>
    </label>
  );
}

function CostMiniRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border bg-white/70 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs font-semibold">{text}</div>
    </div>
  );
}
