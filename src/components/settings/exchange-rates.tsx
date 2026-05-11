"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS, type ExchangeRate, type CurrencyType } from "@/lib/types";
import { fetchTcmbRates } from "@/app/actions/exchange";

interface RateCell {
  id?: string;
  rate: number;
  changed: boolean;
}

interface RatesMap {
  [from: string]: {
    [to: string]: RateCell;
  };
}

export function ExchangeRates() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<RatesMap>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .lte("effective_date", selectedDate)
        .order("from_currency");

      if (error) throw error;

      // Build rates map - get most recent rate for each pair before selected date
      const ratesMap: RatesMap = {};
      let latestUpdate: string | null = null;
      const seenPairs = new Set<string>();

      CURRENCY_OPTIONS.forEach((from) => {
        ratesMap[from] = {};
        CURRENCY_OPTIONS.forEach((to) => {
          if (from !== to) {
            // Find most recent rate for this pair
            const pairRates = data?.filter(
              (r: ExchangeRate) => r.from_currency === from && r.to_currency === to
            ).sort((a, b) => b.effective_date.localeCompare(a.effective_date));

            const existing = pairRates?.[0];

            ratesMap[from][to] = {
              id: existing?.id,
              rate: existing?.rate ?? 1,
              changed: false,
            };
            if (existing?.updated_at) {
              if (!latestUpdate || existing.updated_at > latestUpdate) {
                latestUpdate = existing.updated_at;
              }
            }
          }
        });
      });

      setRates(ratesMap);
      setLastUpdated(latestUpdate);
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedDate]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleRateChange = (from: CurrencyType, to: CurrencyType, value: string) => {
    setRates((prev: RatesMap) => ({
      ...prev,
      [from]: {
        ...prev[from],
        [to]: {
          ...prev[from][to],
          rate: parseFloat(value) || 0,
          changed: true,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData: Array<{
        id?: string;
        from_currency: CurrencyType;
        to_currency: CurrencyType;
        rate: number;
        effective_date: string;
        updated_at: string;
      }> = [];

      Object.entries(rates).forEach(([from, toRates]) => {
        Object.entries(toRates as Record<string, RateCell>).forEach(([to, cell]) => {
          if (cell.changed) {
            upsertData.push({
              from_currency: from as CurrencyType,
              to_currency: to as CurrencyType,
              rate: cell.rate,
              effective_date: selectedDate,
              updated_at: new Date().toISOString(),
            });
          }
        });
      });

      if (upsertData.length > 0) {
        const { error } = await supabase
          .from("exchange_rates")
          .upsert(upsertData, { onConflict: "from_currency,to_currency,effective_date" });

        if (error) throw error;

        // Refresh data
        await fetchRates();
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Kaydetme sırasında bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.values(rates).some((toRates) =>
    Object.values(toRates as Record<string, RateCell>).some((cell) => cell.changed)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Döviz Kurları</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const handleFetchTcmb = async () => {
    setLoading(true);
    try {
      const result = await fetchTcmbRates();
      if (!result.success || !result.data) {
        alert("TCMB verileri alınamadı.");
        return;
      }

      const { USD, EUR, GBP } = result.data;
      const newRates = { ...rates };

      // Helper to update a rate
      const updateRate = (from: string, to: string, val: number) => {
        if (!newRates[from]) newRates[from] = {};
        if (!newRates[from][to]) newRates[from][to] = { id: undefined, rate: 0, changed: false };

        newRates[from][to] = {
          ...newRates[from][to],
          rate: parseFloat(val.toFixed(4)),
          changed: true
        };
      };

      // 1. Update Foreign -> TRY (Buying Rate)
      if (USD) updateRate("USD", "TRY", USD.buying);
      if (EUR) updateRate("EUR", "TRY", EUR.buying);
      if (GBP) updateRate("GBP", "TRY", GBP.buying);

      // 2. Update TRY -> Foreign (1 / Selling Rate usually, or Buying for parity? Let's use 1/Selling for 'Cost')
      if (USD) updateRate("TRY", "USD", 1 / USD.selling);
      if (EUR) updateRate("TRY", "EUR", 1 / EUR.selling);
      if (GBP) updateRate("TRY", "GBP", 1 / GBP.selling);

      // 3. Cross Rates (derived from TRY parity approx)
      // EUR -> USD = EUR.Buying / USD.Selling
      if (EUR && USD) {
        updateRate("EUR", "USD", EUR.buying / USD.selling);
        updateRate("USD", "EUR", USD.buying / EUR.selling);
      }
      if (GBP && USD) {
        updateRate("GBP", "USD", GBP.buying / USD.selling);
        updateRate("USD", "GBP", USD.buying / GBP.selling);
      }
      if (GBP && EUR) {
        updateRate("GBP", "EUR", GBP.buying / EUR.selling);
        updateRate("EUR", "GBP", EUR.buying / GBP.selling);
      }

      setRates(newRates);
      alert("Kurlar TCMB üzerinden güncellendi. Kaydetmeyi unutmayın.");

    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Döviz Kurları</CardTitle>
            <CardDescription>
              Para birimi dönüşüm oranlarını ayarlayın
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  (Son güncelleme:{" "}
                  {new Date(lastUpdated).toLocaleString("tr-TR")})
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleFetchTcmb} title="TCMB'den Çek">
              <span className="text-xs font-bold mr-1">TCMB</span> <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRates} title="Yenile">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Tarih Seçin (Kurların geçerli olduğu tarih)
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Seçilen tarihteki kurları görüntülüyor ve düzenliyorsunuz
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Kaynak</TableHead>
                {CURRENCY_OPTIONS.map((to) => (
                  <TableHead key={to} className="text-center">
                    {to} ({CURRENCY_SYMBOLS[to]})
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CURRENCY_OPTIONS.map((from) => (
                <TableRow key={from}>
                  <TableCell className="font-medium">
                    {from} ({CURRENCY_SYMBOLS[from]})
                  </TableCell>
                  {CURRENCY_OPTIONS.map((to) => (
                    <TableCell key={to} className="text-center">
                      {from === to ? (
                        <span className="text-muted-foreground">1.0000</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          step="0.0001"
                          value={rates[from]?.[to]?.rate ?? 1}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleRateChange(from, to, e.target.value)
                          }
                          className={`w-24 text-center ${rates[from]?.[to]?.changed ? "border-primary" : ""
                            }`}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Kurları Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
