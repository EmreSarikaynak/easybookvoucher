"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Building2, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyType } from "@/lib/types";

interface SalesReport {
  totalSales: number;
  totalVouchers: number;
  currency: CurrencyType;
  byTour: { name: string; count: number; total: number }[];
  byAgency: { name: string; count: number; total: number }[];
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState<SalesReport>({
    totalSales: 0,
    totalVouchers: 0,
    currency: "EUR",
    byTour: [],
    byAgency: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);

      const { data: vouchers } = await supabase
        .from("vouchers")
        .select(
          `
          id,
          total_price,
          currency,
          tour:tours(name),
          agency:agencies(name)
        `
        )
        .gte("tour_date", startDate)
        .lte("tour_date", endDate)
        .eq("status", "active");

      if (!vouchers) {
        setLoading(false);
        return;
      }

      const totalSales = vouchers.reduce((sum, v) => sum + (v.total_price || 0), 0);

      // Tur bazl\u0131 gruplama
      const tourMap = new Map<string, { count: number; total: number }>();
      vouchers.forEach((v) => {
        const tourData = v.tour as unknown as { name: string } | null;
        const tourName = tourData?.name ?? "Belirtilmemi\u015F";
        const existing = tourMap.get(tourName) ?? { count: 0, total: 0 };
        tourMap.set(tourName, {
          count: existing.count + 1,
          total: existing.total + (v.total_price || 0),
        });
      });

      // Acente bazl\u0131 gruplama
      const agencyMap = new Map<string, { count: number; total: number }>();
      vouchers.forEach((v) => {
        const agencyData = v.agency as unknown as { name: string } | null;
        const agencyName = agencyData?.name ?? "Do\u011Frudan Sat\u0131\u015F";
        const existing = agencyMap.get(agencyName) ?? { count: 0, total: 0 };
        agencyMap.set(agencyName, {
          count: existing.count + 1,
          total: existing.total + (v.total_price || 0),
        });
      });

      setReport({
        totalSales,
        totalVouchers: vouchers.length,
        currency: "EUR",
        byTour: Array.from(tourMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total),
        byAgency: Array.from(agencyMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total),
      });

      setLoading(false);
    };

    fetchReport();
  }, [startDate, endDate, supabase]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <p className="text-muted-foreground">
          Sat&#305;&#351; ve performans raporlar&#305;n&#305; g&ouml;r&uuml;nt&uuml;leyin
        </p>
      </div>

      {/* Tarih Filtresi */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label>Ba&#351;lang&#305;&ccedil; Tarihi</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Biti&#351; Tarihi</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* &Ouml;zet Kartlar&#305; */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Sat&#305;&#351;
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold">
                {formatCurrency(report.totalSales, report.currency)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Voucher
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{report.totalVouchers}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tur Bazl&#305; */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" />
            Tur Bazl&#305; Sat&#305;&#351;lar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : report.byTour.length === 0 ? (
            <p className="text-sm text-muted-foreground">Veri bulunamad&#305;</p>
          ) : (
            <div className="space-y-3">
              {report.byTour.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count} voucher
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(item.total, report.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acente Bazl&#305; */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Acente Bazl&#305; Sat&#305;&#351;lar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : report.byAgency.length === 0 ? (
            <p className="text-sm text-muted-foreground">Veri bulunamad&#305;</p>
          ) : (
            <div className="space-y-3">
              {report.byAgency.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count} voucher
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(item.total, report.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
