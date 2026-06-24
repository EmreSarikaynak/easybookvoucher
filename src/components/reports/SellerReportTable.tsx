import { Users, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyType } from "@/lib/types";

export interface SellerReportItem {
  id: string;
  name: string;
  currencyTotals: Record<string, {
    totalSales: number;
    totalDeposit: number;
    restToPay: number;
  }>;
  tourBreakdown?: Record<string, { count: number; paxAdult: number; paxChild: number; paxInfant: number }>;
}

interface Props {
  title: string;
  items: SellerReportItem[];
  loading?: boolean;
}

export function SellerReportTable({ title, items, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Bu tarihlerde henüz satış bulunmuyor.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-muted/20 border-b pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-4 sm:p-6 hover:bg-muted/5 transition-colors">
              <h3 className="font-bold text-lg text-foreground mb-4">{item.name}</h3>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {Object.entries(item.currencyTotals).map(([curr, stats]) => {
                  if (stats.totalSales === 0) return null;

                  return (
                    <div key={curr} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-muted-foreground">{curr} Satışları</span>
                        </div>

                        <div className="space-y-1.5 mt-3 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Kestiği Tutar</span>
                            <span className="font-medium">{formatCurrency(stats.totalSales, curr as CurrencyType)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tahsilatı (Kapora)</span>
                            <span className="font-medium text-blue-600">{formatCurrency(stats.totalDeposit, curr as CurrencyType)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-1.5 border-t">
                            <span className="font-medium">Rest (Teknede Müşteri Ödeyecek)</span>
                            <span className="font-bold text-red-600">{formatCurrency(stats.restToPay, curr as CurrencyType)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(item.currencyTotals).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">İşlem yok</p>
                )}
              </div>

              {item.tourBreakdown && Object.keys(item.tourBreakdown).length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Satılan Turlar
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(item.tourBreakdown)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([tName, stats]) => (
                      <div key={tName} className="bg-muted/30 border rounded-lg p-3 text-sm flex flex-col">
                        <span className="font-semibold mb-2 block leading-tight">{tName}</span>
                        <div className="flex flex-wrap gap-2 text-muted-foreground text-xs mt-auto font-medium">
                           <span className="bg-white border px-1.5 py-0.5 rounded text-foreground">{stats.count} Bilet</span>
                           {stats.paxAdult > 0 && <span className="bg-white border px-1.5 py-0.5 rounded">{stats.paxAdult} Y</span>}
                           {stats.paxChild > 0 && <span className="bg-white border px-1.5 py-0.5 rounded">{stats.paxChild} Ç</span>}
                           {stats.paxInfant > 0 && <span className="bg-white border px-1.5 py-0.5 rounded">{stats.paxInfant} B</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
