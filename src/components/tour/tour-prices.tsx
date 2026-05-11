"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTourPricesData, saveAgencyTourPrices } from "@/app/actions/tour";
import {
  CURRENCY_OPTIONS,
  CURRENCY_SYMBOLS,
  type Tour,
  type Agency,
  type CurrencyType,
} from "@/lib/types";

interface TourPricesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: Tour | null;
  agencyId?: string | null; // If provided, show only this agency's prices
  isAdmin?: boolean;
}

interface PriceCell {
  id?: string;
  price: number;
  currency: CurrencyType;
  changed: boolean;
}

interface AgencyPrices {
  [agencyId: string]: {
    [currency: string]: PriceCell;
  };
}

export function TourPrices({
  open,
  onOpenChange,
  tour,
  agencyId,
  isAdmin = false,
}: TourPricesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [prices, setPrices] = useState<AgencyPrices>({});

  const fetchData = useCallback(async () => {
    if (!tour) return;

    setLoading(true);
    try {
      const { agencies: agenciesList, pricesData } = await getTourPricesData(
        tour.id,
        agencyId ?? undefined
      );
      setAgencies(agenciesList);

      const pricesMap: AgencyPrices = {};
      agenciesList.forEach((agency) => {
        pricesMap[agency.id] = {};
        CURRENCY_OPTIONS.forEach((curr) => {
          const existingPrice = pricesData?.find(
            (p) => p.agency_id === agency.id && p.currency === curr
          );
          pricesMap[agency.id][curr] = {
            id: existingPrice?.id,
            price: existingPrice?.price ?? tour.default_price,
            currency: curr,
            changed: false,
          };
        });
      });
      setPrices(pricesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [tour, agencyId]);

  useEffect(() => {
    if (open && tour) {
      fetchData();
    }
  }, [open, tour, fetchData]);

  const handlePriceChange = (
    agencyId: string,
    currency: CurrencyType,
    value: string
  ) => {
    setPrices((prev) => ({
      ...prev,
      [agencyId]: {
        ...prev[agencyId],
        [currency]: {
          ...prev[agencyId][currency],
          price: parseFloat(value) || 0,
          changed: true,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!tour) return;

    setSaving(true);
    try {
      const rows: Array<{
        id?: string;
        agency_id: string;
        price: number;
        currency: CurrencyType;
      }> = [];

      Object.entries(prices).forEach(([aid, currencies]) => {
        Object.entries(currencies).forEach(([currency, cell]) => {
          if (cell.changed) {
            rows.push({
              ...(cell.id ? { id: cell.id } : {}),
              agency_id: aid,
              price: cell.price,
              currency: currency as CurrencyType,
            });
          }
        });
      });

      if (rows.length > 0) {
        const result = await saveAgencyTourPrices(tour.id, rows);
        if (result.error) {
          alert(result.error);
          return;
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("Kaydetme sırasında bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.values(prices).some((currencies) =>
    Object.values(currencies).some((cell) => cell.changed)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tour?.name} - {isAdmin ? "Acente Fiyatları" : "Fiyatlarım"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : agencies.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Acente bulunamadı
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Acente</TableHead>
                  {CURRENCY_OPTIONS.map((curr) => (
                    <TableHead key={curr} className="text-center w-28">
                      {curr} ({CURRENCY_SYMBOLS[curr]})
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    {CURRENCY_OPTIONS.map((curr) => (
                      <TableCell key={curr} className="text-center">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={prices[agency.id]?.[curr]?.price ?? 0}
                          onChange={(e) =>
                            handlePriceChange(agency.id, curr, e.target.value)
                          }
                          className={`w-24 text-center ${
                            prices[agency.id]?.[curr]?.changed
                              ? "border-primary"
                              : ""
                          }`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
