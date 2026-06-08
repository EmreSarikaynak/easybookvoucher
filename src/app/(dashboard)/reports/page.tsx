"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building2, Users, LayoutDashboard } from "lucide-react";
import { CurrencySummaryCards, type CurrencySummary } from "@/components/reports/CurrencySummaryCards";
import { SellerReportTable, type SellerReportItem } from "@/components/reports/SellerReportTable";

// Gelişmiş Tur Raporu (Döviz Kırılımlı, Bilet ve Kişi Sayısı Dahil)
function TourReportTable({ vouchers, loading }: { vouchers: any[]; loading: boolean }) {
  if (loading) return <div className="h-32 animate-pulse rounded bg-muted" />;
  if (vouchers.length === 0) return <p className="text-sm text-muted-foreground">Veri bulunamadı.</p>;

  // tour -> { tickets, paxAdult, paxChild, paxInfant, currencies: { EUR: val, USD: val } }
  const tourMap = new Map<string, {
    tickets: number;
    paxAdult: number;
    paxChild: number;
    paxInfant: number;
    currencies: Record<string, number>;
  }>();

  vouchers.forEach(v => {
    const tourName = v.tour?.name || "Bilinmeyen Tur";
    const curr = v.currency || "EUR";
    
    if (!tourMap.has(tourName)) {
      tourMap.set(tourName, { 
        tickets: 0, paxAdult: 0, paxChild: 0, paxInfant: 0, 
        currencies: { EUR: 0, USD: 0, GBP: 0, TRY: 0 } 
      });
    }
    
    const stats = tourMap.get(tourName)!;
    stats.tickets++;
    stats.paxAdult += (v.pax_adult || 0);
    stats.paxChild += (v.pax_child || 0);
    stats.paxInfant += (v.pax_infant || 0);
    stats.currencies[curr] = (stats.currencies[curr] || 0) + (v.total_price || 0);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-600" /> Tur Bazlı Satış Hacmi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from(tourMap.entries()).map(([name, stats]) => (
            <div key={name} className="border p-4 rounded-lg bg-card shadow-sm flex flex-col md:flex-row gap-4 justify-between">
              
              {/* Sol Taraf: Tur Adı ve Kisi/Bilet Sayıları */}
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-lg">{name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="bg-muted px-2 py-1 rounded-md text-foreground font-medium border">
                    {stats.tickets} Bilet
                  </span>
                  <span className="flex items-center gap-1">Yetişkin: <strong className="text-foreground">{stats.paxAdult}</strong></span>
                  <span className="flex items-center gap-1">Çocuk: <strong className="text-foreground">{stats.paxChild}</strong></span>
                  <span className="flex items-center gap-1">Bebek: <strong className="text-foreground">{stats.paxInfant}</strong></span>
                </div>
              </div>

              {/* Sağ Taraf: Gelir Dağılımı */}
              <div className="flex-1 max-w-sm sm:min-w-[250px]">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.currencies).map(([curr, total]) => {
                    if (total === 0) return null;
                    return (
                      <div key={curr} className="flex justify-between items-center text-sm bg-muted/30 p-2 rounded border">
                        <span className="text-muted-foreground">{curr}:</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(total, curr as CurrencyType)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("role, agency_id, agencies(*)").eq("id", user.id).single();
        setProfile(data);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    if (checkingAuth) return;
    
    // Yalnızca admin/super_admin ise genel raporu getir
    if (profile?.role !== "super_admin" && profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);

      const { data } = await supabase
        .from("vouchers")
        .select(
          `
          id,
          total_price,
          currency,
          deposit_paid,
          rest_to_pay,
          pax_adult,
          pax_child,
          pax_infant,
          tour:tours(name),
          agency:agencies(name),
          sales_person:profiles(full_name)
        `
        )
        .gte("tour_date", startDate)
        .lte("tour_date", endDate)
        .eq("status", "active")
        .order("tour_date", { ascending: false });

      if (data) setVouchers(data);
      setLoading(false);
    };

    fetchReport();
  }, [startDate, endDate, supabase, checkingAuth, profile]);

  // 1. Genel Pano (CurrencySummaryCards)
  const summaries = useMemo(() => {
    const res: Record<string, CurrencySummary> = {};
    vouchers.forEach((v) => {
      const c = v.currency || "EUR";
      if (!res[c]) res[c] = { currency: c, totalSales: 0, totalDeposit: 0, pendingEasyBook: 0 };
      
      res[c].totalSales += (v.total_price || 0);
      res[c].totalDeposit += (v.deposit_paid || 0);
      res[c].pendingEasyBook += (v.rest_to_pay || 0);
    });
    return res;
  }, [vouchers]);

  // 2. Acente (Agency) Gruplaması (Satıcılar ve Acenteler Birleşik)
  const agencyItems = useMemo(() => {
    const map = new Map<string, SellerReportItem>();
    vouchers.forEach(v => {
      // "Satıcılar ve Acenteler aynı mantıkla çalışıyor" talebi üzerine
      // Eğer bir acente yoksa, doğrudan satıcının ismini acente gibi gösterelim veya "Doğrudan Satış" diyelim.
      // Ya da acente atanmışsa acente adını, atanmamışsa satış personelinin adını kullanalım.
      const agName = v.agency?.name || v.sales_person?.full_name || "Bilinmeyen";
      if (!map.has(agName)) {
        map.set(agName, { id: agName, name: agName, currencyTotals: {}, tourBreakdown: {} });
      }
      
      const ag = map.get(agName)!;
      const c = v.currency || "EUR";
      if (!ag.currencyTotals[c]) {
        ag.currencyTotals[c] = { totalSales: 0, totalDeposit: 0, restToPay: 0 };
      }

      const stats = ag.currencyTotals[c];
      stats.totalSales += (v.total_price || 0);
      stats.totalDeposit += (v.deposit_paid || 0);
      stats.restToPay += (v.rest_to_pay || 0);

      // Tur Kırılımı (tourBreakdown)
      const tName = v.tour?.name || "Bilinmeyen Tur";
      if (!ag.tourBreakdown![tName]) {
        ag.tourBreakdown![tName] = { count: 0, paxAdult: 0, paxChild: 0, paxInfant: 0 };
      }
      ag.tourBreakdown![tName].count++;
      ag.tourBreakdown![tName].paxAdult += (v.pax_adult || 0);
      ag.tourBreakdown![tName].paxChild += (v.pax_child || 0);
      ag.tourBreakdown![tName].paxInfant += (v.pax_infant || 0);

    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [vouchers]);

  if (checkingAuth) {
    return <div className="animate-pulse h-32 bg-muted rounded-md" />;
  }

  // Acente / satış kullanıcısı görünümü
  if (profile && profile.role !== "super_admin" && profile.role !== "admin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
        </div>
        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-white">
          Bu sayfa şu anda yalnızca yöneticiler içindir.
        </div>
      </div>
    );
  }

  // Admin görünümü (Tüm panolar)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <p className="text-muted-foreground">Geçmiş satışlar ve tur bazlı dökümler</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label>Başlangıç Tarihi</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bitiş Tarihi</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted border w-full sm:w-auto overflow-x-auto flex pb-0 p-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-2 flex-1 sm:flex-none">
            <LayoutDashboard className="h-4 w-4" /> Genel Durum
          </TabsTrigger>
          <TabsTrigger value="agencies" className="gap-2 flex-1 sm:flex-none">
            <Building2 className="h-4 w-4" /> Acenteler & Satış Noktaları
          </TabsTrigger>
          <TabsTrigger value="tours" className="gap-2 flex-1 sm:flex-none">
            <MapPin className="h-4 w-4" /> Tur Bazlı
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 outline-none">
          <CurrencySummaryCards summaries={summaries} loading={loading} />
        </TabsContent>

        <TabsContent value="agencies" className="space-y-4 outline-none">
          <SellerReportTable title="Acente Satış Özeti" items={agencyItems} loading={loading} />
        </TabsContent>

        <TabsContent value="tours" className="space-y-4 outline-none">
          <TourReportTable vouchers={vouchers} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
