"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  recordAgentPayment,
  deleteAgentPayment,
  type CariAgentPaymentRow,
} from "@/app/actions/cari";
import type { CurrencyType } from "@/lib/types";

const CURRENCIES: CurrencyType[] = ["EUR", "TRY", "USD", "GBP"];

interface PaymentRecorderProps {
  agencyId: string;
  defaultCurrency?: CurrencyType;
}

export function CariPaymentRecorder({
  agencyId,
  defaultCurrency = "EUR",
}: PaymentRecorderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyType>(defaultCurrency);
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Tutar 0'dan büyük olmalı");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await recordAgentPayment({
        agency_id: agencyId,
        amount: num,
        currency,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      });
      if (!r.ok) {
        setError(r.error ?? "Bilinmeyen hata");
        return;
      }
      setAmount("");
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ödeme Ekle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acente Ödemesi Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tutar</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as CurrencyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Not (opsiyonel)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: 27/05 banka havalesi"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteButtonProps {
  paymentId: string;
  agencyId: string;
}

export function CariPaymentDeleteButton({
  paymentId,
  agencyId,
}: DeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Bu ödeme kaydı silinsin mi?")) return;
    startTransition(async () => {
      const r = await deleteAgentPayment(paymentId, agencyId);
      if (!r.ok) {
        alert(r.error ?? "Silinemedi");
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
      title="Sil"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

/** Read-only re-export for the page (keeps client/server split clean). */
export type { CariAgentPaymentRow };
