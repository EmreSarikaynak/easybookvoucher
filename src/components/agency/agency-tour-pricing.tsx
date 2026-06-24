"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Baby } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAgencyTourPricingMatrix,
  type AgencyTourPricingCell,
} from "@/app/actions/agency";
import type { CurrencyType, Tour } from "@/lib/types";

interface AgencyTourPricingProps {
  agencyId: string;
  onChange: (cells: AgencyTourPricingCell[], dirty: boolean) => void;
}

type CellKey = `${string}_${CurrencyType}`;

type PricingField =
  | "cost_adult"
  | "cost_child"
  | "cost_infant"
  | "price_adult"
  | "price_child"
  | "price_infant";

interface DraftCell extends Omit<AgencyTourPricingCell, "changed"> {
  /** Adminin elle değiştirdiği alanlar — yalnızca bunlar kaydedilir (eskiye dönmeyi önler). */
  changed: Set<PricingField>;
}

const CURRENCIES: CurrencyType[] = ["EUR", "TRY"];

const fallbackCost = (
  tour: Tour,
  currency: CurrencyType,
  who: "adult" | "child" | "infant"
): number => {
  const pick = (eur: number | undefined, tryv: number | undefined) =>
    Math.round((currency === "EUR" ? eur : tryv) ?? 0);
  if (who === "adult") return pick(tour.base_price_adult_eur, tour.base_price_adult_try);
  if (who === "child") return pick(tour.base_price_child_eur, tour.base_price_child_try);
  return pick(tour.base_price_infant_eur, tour.base_price_infant_try);
};

export function AgencyTourPricing({ agencyId, onChange }: AgencyTourPricingProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [drafts, setDrafts] = useState<Record<CellKey, DraftCell>>({});
  const [activeCurrency, setActiveCurrency] = useState<CurrencyType>("EUR");

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const cellKey = (tourId: string, currency: CurrencyType): CellKey =>
    `${tourId}_${currency}` as CellKey;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAgencyTourPricingMatrix(agencyId);
    if (res.error || !res.data) {
      setError(res.error ?? "Veri yüklenemedi");
      setLoading(false);
      return;
    }
    setTours(res.data.tours);

    const next: Record<CellKey, DraftCell> = {};
    res.data.tours.forEach((t) => {
      CURRENCIES.forEach((c) => {
        const existing = res.data!.cells.find(
          (cell) => cell.tour_id === t.id && cell.currency === c
        );
        next[cellKey(t.id, c)] = {
          id: existing?.id,
          tour_id: t.id,
          currency: c,
          cost_adult: existing?.cost_adult != null ? Math.round(existing.cost_adult) : null,
          cost_child: existing?.cost_child != null ? Math.round(existing.cost_child) : null,
          cost_infant: existing?.cost_infant != null ? Math.round(existing.cost_infant) : null,
          price_adult: existing?.price_adult != null ? Math.round(existing.price_adult) : null,
          price_child: existing?.price_child != null ? Math.round(existing.price_child) : 0,
          price_infant: existing?.price_infant != null ? Math.round(existing.price_infant) : null,
          changed: new Set<PricingField>(),
        };
      });
    });
    setDrafts(next);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const dirtyCells: AgencyTourPricingCell[] = Object.values(drafts)
      .filter((d) => d.changed.size > 0)
      .map(({ changed, ...rest }) => ({ ...rest, changed: Array.from(changed) }));
    onChangeRef.current(dirtyCells, dirtyCells.length > 0);
  }, [drafts]);

  const updateCell = (key: CellKey, field: PricingField, raw: string) => {
    const parsed = raw === "" ? null : parseInt(raw, 10);
    const value = parsed === null || Number.isNaN(parsed) ? null : parsed;
    setDrafts((prev) => {
      const nextChanged = new Set(prev[key].changed);
      nextChanged.add(field);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: field === "price_child" ? (value ?? 0) : value,
          changed: nextChanged,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Aktif tur bulunmuyor. Önce tur ekleyin, sonra fiyat girebilirsiniz.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCurrency(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeCurrency === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {c}
          </button>
        ))}
        <p className="text-xs text-muted-foreground ml-auto">
          Maliyet boş bırakılırsa tur varsayılan maliyeti kullanılır.
        </p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Tur</TableHead>
              <TableHead className="text-center">Maliyet (Yet)</TableHead>
              <TableHead className="text-center">Maliyet (Çoc)</TableHead>
              <TableHead className="text-center">Maliyet (Bebek)</TableHead>
              <TableHead className="text-center">Satış (Yet)</TableHead>
              <TableHead className="text-center">Satış (Çoc)</TableHead>
              <TableHead className="text-center">Satış (Bebek)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours.map((tour) => {
              const key = cellKey(tour.id, activeCurrency);
              const cell = drafts[key];
              if (!cell) return null;
              const placeholderAdult = fallbackCost(tour, activeCurrency, "adult");
              const placeholderChild = fallbackCost(tour, activeCurrency, "child");
              const placeholderInfant = fallbackCost(tour, activeCurrency, "infant");
              const dirtyClass = cell.changed.size > 0 ? "border-primary" : "";
              const infantOn = tour.infant_pricing_enabled ?? false;

              return (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {tour.name}
                      {infantOn && <Baby className="h-3.5 w-3.5 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Varsayılan: {placeholderAdult} / {placeholderChild}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={cell.cost_adult ?? ""}
                      placeholder={String(placeholderAdult)}
                      onChange={(e) => updateCell(key, "cost_adult", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={cell.cost_child ?? ""}
                      placeholder={String(placeholderChild)}
                      onChange={(e) => updateCell(key, "cost_child", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {infantOn ? (
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={cell.cost_infant ?? ""}
                        placeholder={String(placeholderInfant)}
                        onChange={(e) => updateCell(key, "cost_infant", e.target.value)}
                        className={`w-24 text-center ${dirtyClass}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={cell.price_adult ?? ""}
                      placeholder="0"
                      onChange={(e) => updateCell(key, "price_adult", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={cell.price_child ?? 0}
                      placeholder="0"
                      onChange={(e) => updateCell(key, "price_child", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {infantOn ? (
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={cell.price_infant ?? ""}
                        placeholder="0"
                        onChange={(e) => updateCell(key, "price_infant", e.target.value)}
                        className={`w-24 text-center ${dirtyClass}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
