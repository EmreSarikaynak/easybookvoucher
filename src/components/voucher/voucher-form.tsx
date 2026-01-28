"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { generateVoucherNo } from "@/lib/utils";
import type { Tour, CurrencyType, Voucher } from "@/lib/types";

interface VoucherFormProps {
  voucher?: Voucher;
}

export function VoucherForm({ voucher }: VoucherFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!voucher;

  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    voucher_no: voucher?.voucher_no ?? generateVoucherNo(),
    tour_id: voucher?.tour_id ?? "",
    tour_date: voucher?.tour_date ?? "",
    customer_name: voucher?.customer_name ?? "",
    hotel: voucher?.hotel ?? "",
    room_no: voucher?.room_no ?? "",
    pax_adult: voucher?.pax_adult ?? 1,
    pax_child: voucher?.pax_child ?? 0,
    pax_infant: voucher?.pax_infant ?? 0,
    pickup_place: voucher?.pickup_place ?? "",
    pickup_time: voucher?.pickup_time ?? "",
    total_price: voucher?.total_price ?? 0,
    currency: (voucher?.currency ?? "EUR") as CurrencyType,
    deposit_paid: voucher?.deposit_paid ?? 0,
    notes: voucher?.notes ?? "",
  });

  useEffect(() => {
    const fetchTours = async () => {
      const { data } = await supabase
        .from("tours")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data) setTours(data);
    };
    fetchTours();
  }, [supabase]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        tour_id: formData.tour_id || null,
        pickup_time: formData.pickup_time || null,
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("vouchers")
          .update(payload)
          .eq("id", voucher.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("vouchers")
          .insert(payload);
        if (insertError) throw insertError;
      }

      router.push("/dashboard/vouchers");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Bir hata olu\u015Ftu";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Misafir & Tur Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Misafir &amp; Tur Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voucher_no">Voucher No</Label>
            <Input
              id="voucher_no"
              value={formData.voucher_no}
              onChange={(e) => handleChange("voucher_no", e.target.value)}
              required
              readOnly={isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_name">Misafir Ad&#305;</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleChange("customer_name", e.target.value)}
              required
              placeholder="Ad Soyad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour_id">Tur</Label>
            <Select
              value={formData.tour_id}
              onValueChange={(val) => handleChange("tour_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tur se&ccedil;in" />
              </SelectTrigger>
              <SelectContent>
                {tours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour_date">Tur Tarihi</Label>
            <Input
              id="tour_date"
              type="date"
              value={formData.tour_date}
              onChange={(e) => handleChange("tour_date", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Konaklama & Transfer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konaklama &amp; Transfer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hotel">Otel</Label>
            <Input
              id="hotel"
              value={formData.hotel}
              onChange={(e) => handleChange("hotel", e.target.value)}
              placeholder="Otel ad&#305;"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room_no">Oda No</Label>
            <Input
              id="room_no"
              value={formData.room_no}
              onChange={(e) => handleChange("room_no", e.target.value)}
              placeholder="Oda numaras&#305;"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickup_place">Al&#305;&#351; Noktas&#305;</Label>
            <Input
              id="pickup_place"
              value={formData.pickup_place}
              onChange={(e) => handleChange("pickup_place", e.target.value)}
              placeholder="Al&#305;&#351; noktas&#305;"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickup_time">Al&#305;&#351; Saati</Label>
            <Input
              id="pickup_time"
              type="time"
              value={formData.pickup_time}
              onChange={(e) => handleChange("pickup_time", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ki&#351;i Say&#305;s&#305; & Fiyat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ki&#351;i Say&#305;s&#305; &amp; Fiyat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pax_adult">Yeti&#351;kin</Label>
            <Input
              id="pax_adult"
              type="number"
              min={0}
              value={formData.pax_adult}
              onChange={(e) =>
                handleChange("pax_adult", parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pax_child">&Ccedil;ocuk</Label>
            <Input
              id="pax_child"
              type="number"
              min={0}
              value={formData.pax_child}
              onChange={(e) =>
                handleChange("pax_child", parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pax_infant">Bebek</Label>
            <Input
              id="pax_infant"
              type="number"
              min={0}
              value={formData.pax_infant}
              onChange={(e) =>
                handleChange("pax_infant", parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_price">Toplam Fiyat</Label>
            <Input
              id="total_price"
              type="number"
              min={0}
              step="0.01"
              value={formData.total_price}
              onChange={(e) =>
                handleChange("total_price", parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Para Birimi</Label>
            <Select
              value={formData.currency}
              onValueChange={(val) => handleChange("currency", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TL</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit_paid">&Ouml;n &Ouml;deme</Label>
            <Input
              id="deposit_paid"
              type="number"
              min={0}
              step="0.01"
              value={formData.deposit_paid}
              onChange={(e) =>
                handleChange("deposit_paid", parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notlar</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Ek notlar..."
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Kaydediliyor..."
            : isEditing
              ? "G&uuml;ncelle"
              : "Voucher Olu&#351;tur"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          &#304;ptal
        </Button>
      </div>
    </form>
  );
}
