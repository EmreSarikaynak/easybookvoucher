"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
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
  /** Parent reads/updates this via the ref-like callback below. */
  onChange: (cells: AgencyTourPricingCell[], dirty: boolean) => void;
}

type CellKey = `${string}_${CurrencyType}`;

interface DraftCell extends AgencyTourPricingCell {
  dirty: boolean;
}

const CURRENCIES: CurrencyType[] = ["EUR", "TRY"];

const fallbackCost = (tour: Tour, currency: CurrencyType, who: "adult" | "child"): number => {
  if (currency === "EUR") {
    return (who === "adult" ? tour.base_price_adult_eur : tour.base_price_child_eur) ?? 0;
  }
  return (who === "adult" ? tour.base_price_adult_try : tour.base_price_child_try) ?? 0;
};

export function AgencyTourPricing({ agencyId, onChange }: AgencyTourPricingProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [drafts, setDrafts] = useState<Record<CellKey, DraftCell>>({});
  const [activeCurrency, setActiveCurrency] = useState<CurrencyType>("EUR");
  // Keep latest onChange in a ref so the dirty-propagation effect below
  // only depends on `drafts` (otherwise inline callbacks cause an infinite loop).
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
          cost_adult: existing?.cost_adult ?? null,
          cost_child: existing?.cost_child ?? null,
          price_adult: existing?.price_adult ?? null,
          price_child: existing?.price_child ?? 0,
          dirty: false,
        };
      });
    });
    setDrafts(next);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Propagate dirty cells upward so the parent's Save button can submit them.
  useEffect(() => {
    const dirtyCells: AgencyTourPricingCell[] = Object.values(drafts)
      .filter((d) => d.dirty)
      .map(({ dirty: _dirty, ...rest }) => rest);
    onChangeRef.current(dirtyCells, dirtyCells.length > 0);
  }, [drafts]);

  const updateCell = (
    key: CellKey,
    field: "cost_adult" | "cost_child" | "price_adult" | "price_child",
    raw: string
  ) => {
    const num = raw === "" ? null : parseFloat(raw);
    const value = num === null || Number.isNaN(num) ? null : num;
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === "price_child" ? value ?? 0 : value,
        dirty: true,
      },
    }));
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
              <TableHead className="text-center">Satış (Yet)</TableHead>
              <TableHead className="text-center">Satış (Çoc)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours.map((tour) => {
              const key = cellKey(tour.id, activeCurrency);
              const cell = drafts[key];
              if (!cell) return null;
              const placeholderAdult = fallbackCost(tour, activeCurrency, "adult");
              const placeholderChild = fallbackCost(tour, activeCurrency, "child");
              const dirtyClass = cell.dirty ? "border-primary" : "";

              return (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">
                    <div>{tour.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Varsayılan: {placeholderAdult.toFixed(2)} / {placeholderChild.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cell.cost_adult ?? ""}
                      placeholder={placeholderAdult.toFixed(2)}
                      onChange={(e) => updateCell(key, "cost_adult", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cell.cost_child ?? ""}
                      placeholder={placeholderChild.toFixed(2)}
                      onChange={(e) => updateCell(key, "cost_child", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cell.price_adult ?? ""}
                      placeholder="0.00"
                      onChange={(e) => updateCell(key, "price_adult", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cell.price_child ?? 0}
                      placeholder="0.00"
                      onChange={(e) => updateCell(key, "price_child", e.target.value)}
                      className={`w-24 text-center ${dirtyClass}`}
                    />
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
