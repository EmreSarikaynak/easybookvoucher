import { TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyType } from "@/lib/types";

export interface CurrencySummary {
  currency: CurrencyType;
  totalSales: number;     // Toplam Ciro
  totalDeposit: number;   // Toplam Kapora
  pendingEasyBook: number; // EasyBook'un Satıcıdan Alacağı/Vereceği (Rest)
}

interface Props {
  summaries: Record<string, CurrencySummary>;
  loading?: boolean;
}

export function CurrencySummaryCards({ summaries, loading }: Props) {
  // Gösterilecek ana kurlar
  const currencies: CurrencyType[] = ["EUR", "USD", "GBP", "TRY"];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {currencies.map((curr) => {
        const data = summaries[curr] || {
          currency: curr,
          totalSales: 0,
          totalDeposit: 0,
          pendingEasyBook: 0,
        };

        return (
          <Card key={curr} className="overflow-hidden border-l-4" style={{ borderLeftColor: getCurrencyColor(curr) }}>
            <CardHeader className="bg-muted/30 pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">
                  {curr} İşlemleri
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 w-full animate-pulse rounded bg-muted" />
                  <div className="h-6 w-full animate-pulse rounded bg-muted" />
                  <div className="h-6 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Toplam Ciro</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(data.totalSales, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-1 border-dashed">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Tahsilat (Kapora)
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(data.totalDeposit, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-1 border-dashed">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Rest Bakiye
                    </span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(data.pendingEasyBook, curr)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getCurrencyColor(curr: string) {
  switch (curr) {
    case "EUR": return "#2563eb"; // Blue
    case "USD": return "#16a34a"; // Green
    case "GBP": return "#9333ea"; // Purple
    case "TRY": return "#dc2626"; // Red
    default: return "#6b7280";
  }
}
