"use client";

import { Fragment, useState } from "react";
import { Save, Loader2, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { updateTourBasePrices } from "@/app/actions/tour";
import type { Tour } from "@/lib/types";

interface TourCostsEditorProps {
  tours: Tour[];
}

interface Draft {
  base_price_adult_eur: number;
  base_price_child_eur: number;
  base_price_adult_try: number;
  base_price_child_try: number;
  base_price_infant_eur: number;
  base_price_infant_try: number;
  infant_pricing_enabled: boolean;
  dirty: boolean;
}

type NumericField =
  | "base_price_adult_eur"
  | "base_price_child_eur"
  | "base_price_adult_try"
  | "base_price_child_try"
  | "base_price_infant_eur"
  | "base_price_infant_try";

export function TourCostsEditor({ tours }: TourCostsEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    tours.forEach((t) => {
      init[t.id] = {
        base_price_adult_eur: Math.round(t.base_price_adult_eur ?? 0),
        base_price_child_eur: Math.round(t.base_price_child_eur ?? 0),
        base_price_adult_try: Math.round(t.base_price_adult_try ?? 0),
        base_price_child_try: Math.round(t.base_price_child_try ?? 0),
        base_price_infant_eur: Math.round(t.base_price_infant_eur ?? 0),
        base_price_infant_try: Math.round(t.base_price_infant_try ?? 0),
        infant_pricing_enabled: t.infant_pricing_enabled ?? false,
        dirty: false,
      };
    });
    return init;
  });

  const updateField = (tourId: string, field: NumericField, raw: string) => {
    const num = parseInt(raw, 10);
    setDrafts((prev) => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        [field]: Number.isNaN(num) ? 0 : num,
        dirty: true,
      },
    }));
  };

  const toggleInfant = (tourId: string) => {
    setDrafts((prev) => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        infant_pricing_enabled: !prev[tourId].infant_pricing_enabled,
        dirty: true,
      },
    }));
  };

  const dirtyCount = Object.values(drafts).filter((d) => d.dirty).length;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const updates = Object.entries(drafts)
      .filter(([, d]) => d.dirty)
      .map(([tour_id, d]) => ({
        tour_id,
        base_price_adult_eur: d.base_price_adult_eur,
        base_price_child_eur: d.base_price_child_eur,
        base_price_adult_try: d.base_price_adult_try,
        base_price_child_try: d.base_price_child_try,
        base_price_infant_eur: d.base_price_infant_eur,
        base_price_infant_try: d.base_price_infant_try,
        infant_pricing_enabled: d.infant_pricing_enabled,
      }));

    const res = await updateTourBasePrices(updates);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], dirty: false };
      });
      return next;
    });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white shadow-sm">
        {/* Desktop */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead className="sticky top-14 lg:top-16 z-20">
              <tr className="border-b bg-slate-100">
                <th className="text-left py-3 px-4 font-semibold bg-slate-100">Tur Adı</th>
                <th className="text-center py-3 px-2 font-semibold bg-slate-100">EUR Yet</th>
                <th className="text-center py-3 px-2 font-semibold bg-slate-100">EUR Çoc</th>
                <th className="text-center py-3 px-2 font-semibold bg-slate-100">TL Yet</th>
                <th className="text-center py-3 px-2 font-semibold bg-slate-100">TL Çoc</th>
              </tr>
            </thead>
            <tbody>
              {tours.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Henüz aktif tur bulunmuyor
                  </td>
                </tr>
              ) : (
                tours.map((tour) => {
                  const d = drafts[tour.id];
                  const dirtyClass = d.dirty ? "border-primary" : "";
                  return (
                    <Fragment key={tour.id}>
                      <tr className={d.infant_pricing_enabled ? "" : "border-b last:border-0"}>
                        <td className="py-2 px-4 font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{tour.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleInfant(tour.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition ${
                                d.infant_pricing_enabled
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                              }`}
                              title="Bu tur için bebek fiyatını aç/kapat"
                            >
                              <Baby className="h-3.5 w-3.5" />
                              Bebek
                            </button>
                            {d.dirty && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                Kaydedilmedi
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={d.base_price_adult_eur}
                            onChange={(e) =>
                              updateField(tour.id, "base_price_adult_eur", e.target.value)
                            }
                            className={`w-24 mx-auto text-center ${dirtyClass}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={d.base_price_child_eur}
                            onChange={(e) =>
                              updateField(tour.id, "base_price_child_eur", e.target.value)
                            }
                            className={`w-24 mx-auto text-center ${dirtyClass}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={d.base_price_adult_try}
                            onChange={(e) =>
                              updateField(tour.id, "base_price_adult_try", e.target.value)
                            }
                            className={`w-24 mx-auto text-center ${dirtyClass}`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={d.base_price_child_try}
                            onChange={(e) =>
                              updateField(tour.id, "base_price_child_try", e.target.value)
                            }
                            className={`w-24 mx-auto text-center ${dirtyClass}`}
                          />
                        </td>
                      </tr>
                      {d.infant_pricing_enabled && (
                        <tr className="border-b last:border-0 bg-blue-50/40">
                          <td colSpan={5} className="py-2 px-4">
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                                <Baby className="h-3.5 w-3.5" />
                                Bebek maliyeti
                              </span>
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                EUR Bebek
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  value={d.base_price_infant_eur}
                                  onChange={(e) =>
                                    updateField(tour.id, "base_price_infant_eur", e.target.value)
                                  }
                                  className={`w-24 text-center ${dirtyClass}`}
                                />
                              </label>
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                TL Bebek
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  value={d.base_price_infant_try}
                                  onChange={(e) =>
                                    updateField(tour.id, "base_price_infant_try", e.target.value)
                                  }
                                  className={`w-24 text-center ${dirtyClass}`}
                                />
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden divide-y">
          {tours.map((tour) => {
            const d = drafts[tour.id];
            const dirtyClass = d.dirty ? "border-primary" : "";
            return (
              <div key={tour.id} className="p-4 space-y-3">
                <div className="text-sm flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{tour.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleInfant(tour.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition ${
                      d.infant_pricing_enabled
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Baby className="h-3.5 w-3.5" />
                    Bebek
                  </button>
                  {d.dirty && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      Kaydedilmedi
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">EUR Yet</label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={d.base_price_adult_eur}
                      onChange={(e) =>
                        updateField(tour.id, "base_price_adult_eur", e.target.value)
                      }
                      className={`text-center ${dirtyClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">EUR Çoc</label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={d.base_price_child_eur}
                      onChange={(e) =>
                        updateField(tour.id, "base_price_child_eur", e.target.value)
                      }
                      className={`text-center ${dirtyClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">TL Yet</label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={d.base_price_adult_try}
                      onChange={(e) =>
                        updateField(tour.id, "base_price_adult_try", e.target.value)
                      }
                      className={`text-center ${dirtyClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">TL Çoc</label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={d.base_price_child_try}
                      onChange={(e) =>
                        updateField(tour.id, "base_price_child_try", e.target.value)
                      }
                      className={`text-center ${dirtyClass}`}
                    />
                  </div>
                  {d.infant_pricing_enabled && (
                    <>
                      <div>
                        <label className="text-[11px] text-blue-700 flex items-center gap-1">
                          <Baby className="h-3 w-3" />
                          EUR Bebek
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={d.base_price_infant_eur}
                          onChange={(e) =>
                            updateField(tour.id, "base_price_infant_eur", e.target.value)
                          }
                          className={`text-center ${dirtyClass}`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-700 flex items-center gap-1">
                          <Baby className="h-3 w-3" />
                          TL Bebek
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={d.base_price_infant_try}
                          onChange={(e) =>
                            updateField(tour.id, "base_price_infant_try", e.target.value)
                          }
                          className={`text-center ${dirtyClass}`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-16 lg:bottom-0 bg-white/95 py-3 px-1 border-t">
        {dirtyCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {dirtyCount} tur değiştirildi
          </span>
        )}
        <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Kaydet
        </Button>
      </div>
    </div>
  );
}
