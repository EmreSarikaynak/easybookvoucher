"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateVoucherNo } from "@/lib/utils";
import { createVoucher, updateVoucher } from "@/app/actions/voucher";
import type { Tour, CurrencyType, Voucher } from "@/lib/types";
import { SELF_PICKUP, encodeSelfPickup, parseSelfPickup } from "@/lib/constants";

interface VoucherFormProps {
  voucher?: Voucher;
  tours?: Tour[];
}

type NumField = "pax_adult" | "pax_child" | "pax_infant" | "total_price" | "deposit_paid";

export function VoucherForm({ voucher, tours = [] }: VoucherFormProps) {
  const router = useRouter();
  const isEditing = !!voucher;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse initial self-pickup state from voucher
  const initParsed = parseSelfPickup(voucher?.pickup_place);
  const [selfPickup, setSelfPickup] = useState(initParsed.isSelf);
  const [departureLocation, setDepartureLocation] = useState(initParsed.location ?? "");

  const [formData, setFormData] = useState<{
    voucher_no: string;
    tour_id: string;
    tour_date: string;
    customer_name: string;
    customer_phone: string;
    hotel: string;
    room_no: string;
    pax_adult: number | "";
    pax_child: number | "";
    pax_infant: number | "";
    pickup_place: string;
    pickup_time: string;
    total_price: number | "";
    currency: CurrencyType;
    deposit_paid: number | "";
    notes: string;
  }>({
    voucher_no: voucher?.voucher_no ?? generateVoucherNo(),
    tour_id: voucher?.tour_id ?? "",
    tour_date: voucher?.tour_date ?? new Date().toISOString().split("T")[0],
    customer_name: voucher?.customer_name ?? "",
    customer_phone: voucher?.customer_phone ?? "",
    hotel: voucher?.hotel ?? "",
    room_no: voucher?.room_no ?? "",
    pax_adult: voucher?.pax_adult ?? 1,
    pax_child: voucher?.pax_child ?? 0,
    pax_infant: voucher?.pax_infant ?? 0,
    pickup_place: selfPickup ? SELF_PICKUP : (voucher?.pickup_place ?? ""),
    pickup_time: selfPickup ? "" : (voucher?.pickup_time ?? ""),
    total_price: voucher?.total_price ?? 0,
    currency: (voucher?.currency ?? "USD") as CurrencyType,
    deposit_paid: voucher?.deposit_paid ?? 0,
    notes: voucher?.notes ?? "",
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const num = (v: number | "") => (v === "" ? 0 : Number(v));

  const clearOnFocus = (field: NumField) => {
    setFormData((prev) => ({ ...prev, [field]: "" }));
  };
  const blurNum = (field: NumField, fallback: number) => {
    setFormData((prev) => ({ ...prev, [field]: prev[field] === "" ? fallback : prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        voucher_no: formData.voucher_no,
        tour_id: formData.tour_id || null,
        tour_date: formData.tour_date,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        hotel: formData.hotel,
        room_no: formData.room_no,
        pax_adult: num(formData.pax_adult),
        pax_child: num(formData.pax_child),
        pax_infant: num(formData.pax_infant),
        pickup_place: formData.pickup_place,
        pickup_time: formData.pickup_time || null,
        total_price: num(formData.total_price),
        currency: formData.currency,
        deposit_paid: num(formData.deposit_paid),
        notes: formData.notes,
      };

      let result;
      if (isEditing && voucher) {
        result = await updateVoucher(voucher.id, payload);
      } else {
        result = await createVoucher(payload);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/vouchers");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Bir hata oluştu";
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

      {/* Bilet No — en üstte, değiştirilemez */}
      <div className="flex items-center gap-3">
        <Label htmlFor="voucher_no" className="shrink-0 w-36">Bilet No</Label>
        <Input
          id="voucher_no"
          value={formData.voucher_no}
          readOnly
          required
          className="flex-1 bg-muted font-mono"
          title="Bilet numarası EBook ile başlar ve değiştirilemez"
        />
      </div>

      {/* Misafir ve Tur Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Misafir ve Tur Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="customer_name" className="shrink-0 w-36">Misafir Adı</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleChange("customer_name", e.target.value)}
              required
              placeholder="Ad Soyad"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="customer_phone" className="shrink-0 w-36">Müşteri Telefonu</Label>
            <PhoneInput
              id="customer_phone"
              value={formData.customer_phone}
              onChange={(val) => handleChange("customer_phone", val)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="tour_id" className="shrink-0 w-36">Tur</Label>
            <Select
              value={formData.tour_id}
              onValueChange={(val) => handleChange("tour_id", val)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tur seçin">
                  {formData.tour_id
                    ? tours.find((t) => t.id === formData.tour_id)?.name || "Tur seçin"
                    : "Tur seçin"}
                </SelectValue>
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
          <div className="flex items-center gap-3">
            <Label htmlFor="tour_date" className="shrink-0 w-36">Tur Tarihi</Label>
            <Input
              id="tour_date"
              type="date"
              value={formData.tour_date}
              onChange={(e) => handleChange("tour_date", e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Konaklama & Transfer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konaklama ve Transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="hotel" className="shrink-0 w-36">Otel</Label>
            <Input
              id="hotel"
              value={formData.hotel}
              onChange={(e) => handleChange("hotel", e.target.value)}
              placeholder="Otel adı"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="room_no" className="shrink-0 w-36">Oda No</Label>
            <Input
              id="room_no"
              value={formData.room_no}
              onChange={(e) => handleChange("room_no", e.target.value)}
              placeholder="Oda numarası"
              className="flex-1"
            />
          </div>
          {/* Self-pickup toggle */}
          <div className="flex items-center gap-3 pb-1">
            <span className="shrink-0 w-36" />
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selfPickup}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelfPickup(checked);
                  setDepartureLocation("");
                  if (checked) {
                    setFormData((prev) => ({ ...prev, pickup_place: SELF_PICKUP, pickup_time: "" }));
                  } else {
                    setFormData((prev) => ({ ...prev, pickup_place: "", pickup_time: "" }));
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-orange-600">🚶 Kendileri Geliyor (Transfer Yok)</span>
            </label>
          </div>

          {!selfPickup && (
            <div className="flex items-center gap-3">
              <Label htmlFor="pickup_place" className="shrink-0 w-36">Alış Noktası</Label>
              <Input
                id="pickup_place"
                value={formData.pickup_place}
                onChange={(e) => handleChange("pickup_place", e.target.value)}
                placeholder="Alış noktası"
                className="flex-1"
              />
            </div>
          )}
          {!selfPickup && (
            <div className="flex items-center gap-3">
              <Label htmlFor="pickup_time" className="shrink-0 w-36">Alış Saati</Label>
              <Input
                id="pickup_time"
                type="time"
                value={formData.pickup_time}
                onChange={(e) => handleChange("pickup_time", e.target.value)}
                className="flex-1"
              />
            </div>
          )}
          {selfPickup && (
            <div className="flex items-center gap-3">
              <Label htmlFor="departure_location" className="shrink-0 w-36 text-green-700 font-semibold">
                📍 Nereden Kalkıyor
              </Label>
              <Input
                id="departure_location"
                value={departureLocation}
                onChange={(e) => {
                  const loc = e.target.value;
                  setDepartureLocation(loc);
                  setFormData((prev) => ({ ...prev, pickup_place: encodeSelfPickup(loc) }));
                }}
                placeholder="Kalkış noktası (ör: Bodrum Marina)"
                className="flex-1 border-green-300 focus-visible:ring-green-400"
              />
            </div>
          )}
          {selfPickup && (
            <div className="flex items-center gap-3">
              <Label htmlFor="departure_time" className="shrink-0 w-36 text-green-700 font-semibold">
                🚢 Hareket Saati
              </Label>
              <Input
                id="departure_time"
                type="time"
                value={formData.pickup_time}
                onChange={(e) => handleChange("pickup_time", e.target.value)}
                className="flex-1 border-green-300 focus-visible:ring-green-400"
                placeholder="Hareket saati"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kişi Sayısı & Fiyat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kişi Sayısı ve Fiyat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="pax_adult">Yetişkin</Label>
              <Select
                value={String(formData.pax_adult || 0)}
                onValueChange={(val) => handleChange("pax_adult", parseInt(val, 10))}
              >
                <SelectTrigger id="pax_adult" className="text-slate-900 bg-white">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Array.from({ length: 61 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pax_child">Çocuk</Label>
              <Select
                value={String(formData.pax_child || 0)}
                onValueChange={(val) => handleChange("pax_child", parseInt(val, 10))}
              >
                <SelectTrigger id="pax_child" className="text-slate-900 bg-white">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Array.from({ length: 61 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pax_infant">Bebek</Label>
              <Select
                value={String(formData.pax_infant || 0)}
                onValueChange={(val) => handleChange("pax_infant", parseInt(val, 10))}
              >
                <SelectTrigger id="pax_infant" className="text-slate-900 bg-white">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Array.from({ length: 61 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="total_price" className="shrink-0 w-36">Toplam Fiyat</Label>
            <Input
              id="total_price"
              type="number"
              min={0}
              step="0.01"
              value={formData.total_price === "" ? "" : formData.total_price}
              onChange={(e) =>
                handleChange("total_price", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
              }
              onFocus={() => clearOnFocus("total_price")}
              onBlur={() => blurNum("total_price", 0)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="currency" className="shrink-0 w-36">Para Birimi</Label>
            <Select
              value={formData.currency}
              onValueChange={(val) => handleChange("currency", val)}
            >
              <SelectTrigger className="flex-1">
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
          <div className="flex items-center gap-3">
            <Label htmlFor="deposit_paid" className="shrink-0 w-36">Ön Ödeme</Label>
            <Input
              id="deposit_paid"
              type="number"
              min={0}
              step="0.01"
              value={formData.deposit_paid === "" ? "" : formData.deposit_paid}
              onChange={(e) =>
                handleChange("deposit_paid", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
              }
              onFocus={() => clearOnFocus("deposit_paid")}
              onBlur={() => blurNum("deposit_paid", 0)}
              className="flex-1"
            />
          </div>
          {/* Rest Tutar (otomatik) */}
          <div className="flex items-center gap-3">
            <Label className="shrink-0 w-36 text-orange-600 font-semibold">Rest</Label>
            <Input
              value={(() => {
                const total = num(formData.total_price);
                const paid = num(formData.deposit_paid);
                const rest = total - paid;
                return rest > 0 ? rest.toFixed(2) : "0.00";
              })()}
              readOnly
              className="flex-1 bg-muted font-mono font-semibold text-orange-600"
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
          <div className="flex items-start gap-3">
            <Label htmlFor="notes" className="shrink-0 w-36 pt-2">Notlar</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Ek notlar..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          İptal
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="min-w-[200px] px-8 py-2.5 text-base"
        >
          {loading
            ? "Kaydediliyor..."
            : isEditing
              ? "Güncelle"
              : "Bilet Oluştur"}
        </Button>
      </div>
    </form>
  );
}
