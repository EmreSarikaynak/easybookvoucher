"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createAgentPayment,
  getAgentAccountingSummary,
  type AgentAccountingSummary,
} from "@/app/actions/agent-payment";
import type { Agency, CurrencyType } from "@/lib/types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  TRY: "₺",
  GBP: "£",
};

interface AgencyAccountingProps {
  agency: Agency;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  isAdmin?: boolean;
}

export function AgencyAccounting({
  agency,
  open,
  onOpenChange,
  inline = false,
  isAdmin = false,
}: AgencyAccountingProps) {
  const [summary, setSummary] = useState<AgentAccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    currency: "EUR" as CurrencyType,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getAgentAccountingSummary(agency.id);
      setSummary(data);
    } catch (err) {
      console.error("Accounting summary error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSummary();
    }
  }, [open, agency.id]);

  const handlePaymentSubmit = async () => {
    if (paymentForm.amount <= 0) return;

    setSaving(true);
    try {
      const result = await createAgentPayment({
        agent_id: agency.id,
        payment_amount: paymentForm.amount,
        payment_currency: paymentForm.currency,
        payment_date: paymentForm.date,
        notes: paymentForm.notes || undefined,
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      setPaymentDialogOpen(false);
      setPaymentForm({
        amount: 0,
        currency: "EUR",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      await loadSummary();
    } catch (err) {
      alert("Ödeme kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const eurPayments = summary?.paymentsByCurrency?.["EUR"] ?? 0;
  const netBalanceEur = (summary?.totalDebtEur ?? 0) - eurPayments;

  const content = (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {agency.name} — Muhasebe
        </h2>
      </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Yükleniyor...
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Borç */}
                <Card className="border-red-200 bg-red-50/50">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-xs text-red-600 font-semibold uppercase mb-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Toplam Borç
                    </div>
                    <div className="text-2xl font-bold text-red-700">
                      {summary.totalDebtEur.toFixed(2)} €
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      {summary.voucherCount} bilet
                    </div>
                  </CardContent>
                </Card>

                {/* Ödemeler (EUR) */}
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-xs text-green-600 font-semibold uppercase mb-1">
                      <TrendingDown className="h-3.5 w-3.5" /> EUR Ödemeler
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {eurPayments.toFixed(2)} €
                    </div>
                  </CardContent>
                </Card>

                {/* Net */}
                <Card className={`${netBalanceEur > 0 ? "border-orange-200 bg-orange-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase mb-1"
                      style={{ color: netBalanceEur > 0 ? "#ea580c" : "#059669" }}>
                      <Wallet className="h-3.5 w-3.5" /> Net Bakiye (EUR)
                    </div>
                    <div className="text-2xl font-bold"
                      style={{ color: netBalanceEur > 0 ? "#ea580c" : "#059669" }}>
                      {netBalanceEur > 0 ? `${netBalanceEur.toFixed(2)} €` : "✓ Temiz"}
                    </div>
                    {netBalanceEur > 0 && (
                      <div className="text-xs mt-1" style={{ color: "#ea580c" }}>
                        Acente hâlâ borçlu
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Other Currency Payments */}
              {Object.entries(summary.paymentsByCurrency)
                .filter(([curr]) => curr !== "EUR")
                .length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Diğer Para Birimlerindeki Ödemeler</h4>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(summary.paymentsByCurrency)
                      .filter(([curr]) => curr !== "EUR")
                      .map(([curr, total]) => (
                        <div key={curr} className="bg-white rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono font-semibold">{total.toFixed(2)}</span>
                          <span className="ml-1 text-muted-foreground">{CURRENCY_SYMBOLS[curr] || curr}</span>
                        </div>
                      ))
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ Bu ödemeler EUR borcundan otomatik düşülmez. Admin manuel olarak karşılaştırır.
                  </p>
                </div>
              )}

              {/* Recent Payments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Ödeme Geçmişi
                  </h4>
                  {isAdmin && (
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Ödeme Ekle
                    </Button>
                  )}
                </div>

                {summary.payments.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                    Henüz ödeme kaydı yok
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left py-2 px-3 font-medium">Tarih</th>
                          <th className="text-right py-2 px-3 font-medium">Tutar</th>
                          <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Not</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.payments.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(p.payment_date).toLocaleDateString("tr-TR")}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-green-700">
                              {p.payment_amount.toFixed(2)} {CURRENCY_SYMBOLS[p.payment_currency] || p.payment_currency}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground text-xs hidden sm:table-cell">
                              {p.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Veriler yüklenemedi
            </div>
          )}
        </>
  );

  return (
    <>
      {inline ? (
        <div className="bg-white rounded-lg border shadow-sm p-6 overflow-x-auto">
          {content}
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {content}
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Entry Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ödeme Ekle — {agency.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tutar *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paymentForm.amount || ""}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select
                  value={paymentForm.currency}
                  onValueChange={(val) =>
                    setPaymentForm((p) => ({
                      ...p,
                      currency: val as CurrencyType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ödeme Tarihi</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Not (opsiyonel)</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Ödeme hakkında not..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              İptal
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Ödeme Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
