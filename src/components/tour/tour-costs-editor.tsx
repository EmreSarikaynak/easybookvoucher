"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
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
  dirty: boolean;
}

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
        dirty: false,
      };
    });
    return init;
  });

  const updateField = (
    tourId: string,
    field: keyof Omit<Draft, "dirty">,
    raw: string
  ) => {
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

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Tur Adı</th>
                <th className="text-center py-3 px-2 font-semibold">EUR Yet</th>
                <th className="text-center py-3 px-2 font-semibold">EUR Çoc</th>
                <th className="text-center py-3 px-2 font-semibold">TL Yet</th>
                <th className="text-center py-3 px-2 font-semibold">TL Çoc</th>
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
                    <tr key={tour.id} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">
                        {tour.name}
                        {d.dirty && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Kaydedilmedi
                          </span>
                        )}
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
                <div className="font-medium text-sm flex items-center gap-2">
                  {tour.name}
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
