import { useState } from "react";
import { CheckCircle2, CircleDashed, Users, Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { updateVoucherPaymentStatus } from "@/app/actions/voucher";
import type { CurrencyType } from "@/lib/types";

// Bu tablo satıcı (Sales Person) bazlı veya Acente (Agency) bazlı çalışabilir.
// Ortak veri yapısı:

export interface SellerReportItem {
  id: string; // Seller or Agency ID
  name: string; // Name of Seller or Agency
  currencyTotals: Record<string, {
    totalSales: number;
    totalDeposit: number;
    restToPay: number;
    pendingCount: number; // Ödemesi "pending" olan voucher sayısı
    paidCount: number;    // Ödemesi "paid" olan voucher sayısı
    vouchers: any[];      // İlgili biletlerin tam listesi (durum güncellemek için gerekli)
    agentOwesEur?: number; // Acentenin EasyBook'a olan asıl borcu (Sadece EUR sekmesinde mantıklı)
  }>;
  tourBreakdown?: Record<string, { count: number; paxAdult: number; paxChild: number; paxInfant: number }>;
}

interface Props {
  title: string;
  items: SellerReportItem[];
  loading?: boolean;
}

export function SellerReportTable({ title, items, loading }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Bu satıcının/acentenin, belirli bir para birimindeki bekleyen biletlerini "Ödendi" işaretler
  const markAsPaid = async (vouchers: any[]) => {
    const pendingVouchers = vouchers.filter(v => v.agency_payment_status !== "paid");
    if (pendingVouchers.length === 0) return;

    // İlk ID'yi loading state için tut
    setUpdatingId(pendingVouchers[0].id);

    try {
      // Bütün biletleri sırayla veya paralel güncelle
      for (const v of pendingVouchers) {
        await updateVoucherPaymentStatus(v.id, true);
      }
      alert("Başarılı: Seçili kalemler 'Ödendi' olarak işaretlendi.");
    } catch (e: any) {
      alert("Hata: " + (e.message || "Ödeme durumu güncellenemedi."));
    } finally {
      setUpdatingId(null);
    }
  };

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
                  
                  const isUpdating = updatingId && stats.vouchers.some(v => v.id === updatingId);
                  const hasPending = stats.pendingCount > 0;

                  return (
                    <div key={curr} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-muted-foreground">{curr} Satışları</span>
                          {hasPending ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                              <CircleDashed className="h-3 w-3" />
                              Bekliyor
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              Ödendi
                            </span>
                          )}
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
                          {curr === "EUR" && stats.agentOwesEur !== undefined && stats.agentOwesEur > 0 && (
                            <div className="flex justify-between text-sm pt-2 mt-2 border-t-2 border-dashed border-red-200 bg-red-50/50 p-2 rounded">
                              <span className="font-bold text-red-700">Acente ⇒ EasyBook Borcu</span>
                              <span className="font-black text-red-800">{formatCurrency(stats.agentOwesEur, "EUR")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ödeme Butonu */}
                      {hasPending ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                          disabled={!!updatingId}
                          onClick={() => markAsPaid(stats.vouchers)}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Ödendi Olarak İşaretle
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 pointer-events-none"
                          tabIndex={-1}
                        >
                          Hesap Kapalı
                        </Button>
                      )}
                    </div>
                  );
                })}
                {Object.keys(item.currencyTotals).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">İşlem yok</p>
                )}
              </div>

              {/* Satılan Turlar (Tur Kırılımı) */}
              {item.tourBreakdown && Object.keys(item.tourBreakdown).length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Satılan Turlar
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(item.tourBreakdown)
                      .sort((a, b) => b[1].count - a[1].count) // En çok satandan aza doğru sırala
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
