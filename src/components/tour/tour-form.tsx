"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
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
import { createTour, updateTour } from "@/app/actions/tour";
import { isStaleServerActionError, recoverFromStaleDeploy } from "@/lib/stale-action";
import { TourTranslationTabs } from "./tour-translation-tabs";
import { TourMediaSection } from "./tour-media-section";
import {
  DURATION_OPTIONS,
  CURRENCY_OPTIONS,
  type Tour,
  type CurrencyType,
} from "@/lib/types";
import {
  buildTourPublicUrl,
  normalizeTourTranslations,
  primaryTranslationName,
  type TourTranslations,
} from "@/lib/tour-i18n";

interface TourFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour?: Tour | null;
  onSave: (tourId?: string) => void;
  /** Full-page mode: no dialog wrapper */
  variant?: "dialog" | "page";
}

export function TourForm({
  open,
  onOpenChange,
  tour,
  onSave,
  variant = "dialog",
}: TourFormProps) {
  const isEditing = !!tour;
  const isPage = variant === "page";
  const visible = isPage || open;

  const [loading, setLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [formData, setFormData] = useState({
    duration: "",
    default_price: 0,
    currency: "EUR" as CurrencyType,
    pickup_locations: [] as string[],
    images: [] as string[],
    videos: [] as string[],
    translations: {} as TourTranslations,
    tour_url: "",
    is_active: true,
    tour_managers: [] as { name: string; phone: string }[],
    base_price_adult_eur: 0,
    base_price_child_eur: 0,
    base_price_adult_try: 0,
    base_price_child_try: 0,
    departure_days: [] as string[],
    departure_time: "" as string,
    meeting_point: "" as string,
    pickup_zones: [] as { region: string; time: string; meeting_point: string }[],
  });

  useEffect(() => {
    if (!visible) return;
    setSaveResult(null);
    if (tour) {
      const translations = normalizeTourTranslations(
        tour.translations,
        tour.name,
        tour.description
      );
      setFormData({
        duration: tour.duration ?? "",
        default_price: tour.default_price,
        currency: tour.currency,
        pickup_locations: tour.pickup_locations ?? [],
        images: tour.images ?? [],
        videos: tour.videos ?? [],
        translations,
        tour_url: tour.tour_url ?? buildTourPublicUrl(tour.id),
        is_active: tour.is_active,
        tour_managers: tour.tour_managers ?? [],
        base_price_adult_eur: tour.base_price_adult_eur ?? 0,
        base_price_child_eur: tour.base_price_child_eur ?? 0,
        base_price_adult_try: tour.base_price_adult_try ?? 0,
        base_price_child_try: tour.base_price_child_try ?? 0,
        departure_days: tour.departure_days ?? [],
        departure_time: tour.departure_time ?? "",
        meeting_point: tour.meeting_point ?? "",
        pickup_zones: (tour.pickup_zones ?? []).map((z) => ({
          region: z?.region ?? "",
          time: z?.time ?? "",
          meeting_point: z?.meeting_point ?? "",
        })),
      });
    } else {
      setFormData({
        duration: "",
        default_price: 0,
        currency: "EUR",
        pickup_locations: [],
        images: [],
        videos: [],
        translations: normalizeTourTranslations(null, "", null),
        tour_url: "",
        is_active: true,
        tour_managers: [],
        base_price_adult_eur: 0,
        base_price_child_eur: 0,
        base_price_adult_try: 0,
        base_price_child_try: 0,
        departure_days: [],
        departure_time: "",
        meeting_point: "",
        pickup_zones: [],
      });
    }
  }, [visible, tour]);

  const handleSubmit = async () => {
    const primaryName = primaryTranslationName(formData.translations);
    if (!primaryName.trim()) {
      setSaveResult({
        type: "error",
        text: "En az bir dilde tur adı zorunludur (Türkçe önerilir).",
      });
      return;
    }

    setLoading(true);
    setSaveResult(null);
    try {
      const trDesc = formData.translations.tr?.description?.trim() || null;
      const payload = {
        name: primaryName,
        description: trDesc,
        duration: formData.duration || null,
        default_price: formData.default_price,
        currency: formData.currency,
        pickup_locations: formData.pickup_locations,
        images: formData.images,
        videos: formData.videos,
        translations: formData.translations,
        tour_url: formData.tour_url || null,
        is_active: formData.is_active,
        tour_managers: formData.tour_managers,
        base_price_adult_eur: formData.base_price_adult_eur,
        base_price_child_eur: formData.base_price_child_eur,
        base_price_adult_try: formData.base_price_adult_try,
        base_price_child_try: formData.base_price_child_try,
        departure_days: formData.departure_days,
        departure_time: formData.departure_time || null,
        meeting_point: formData.meeting_point || null,
        pickup_zones: formData.pickup_zones,
      };

      const result =
        isEditing && tour ? await updateTour(tour.id, payload) : await createTour(payload);

      if (result.error) {
        setSaveResult({ type: "error", text: result.error });
        return;
      }

      const newId = "id" in result && result.id ? result.id : tour?.id;
      if (!isEditing && newId && !formData.tour_url) {
        await updateTour(newId, {
          ...payload,
          tour_url: buildTourPublicUrl(newId),
        });
      }

      setSaveResult({
        type: "success",
        text: isEditing
          ? "Değişiklikler başarıyla kaydedildi ✓"
          : "Tur başarıyla oluşturuldu ✓",
      });
      onSave(newId);
      // Dialog modunda 1sn sonra kapansın ki kullanıcı yeşil onayı görebilsin
      if (!isPage) {
        setTimeout(() => onOpenChange(false), 1000);
      }
    } catch (error) {
      console.error("Save error:", error);
      if (isStaleServerActionError(error)) {
        setSaveResult({
          type: "error",
          text: "Yeni bir sürüm yayınlandı. Sayfa otomatik yenileniyor…",
        });
        await recoverFromStaleDeploy();
        return;
      }
      setSaveResult({ type: "error", text: "Kaydetme sırasında bir hata oluştu!" });
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <div className="space-y-6">
      <TourTranslationTabs
        translations={formData.translations}
        onChange={(translations) => setFormData((p) => ({ ...p, translations }))}
      />

      <TourMediaSection
        images={formData.images}
        videos={formData.videos}
        onImagesChange={(images) => setFormData((p) => ({ ...p, images }))}
        onVideosChange={(videos) => setFormData((p) => ({ ...p, videos }))}
      />

      <div className="space-y-2">
        <Label htmlFor="tour_url">
          Müşteri Sayfası URL{" "}
          <span className="text-xs text-muted-foreground">(QR kod / paylaşım)</span>
        </Label>
        <Input
          id="tour_url"
          type="url"
          value={formData.tour_url}
          onChange={(e) => setFormData((p) => ({ ...p, tour_url: e.target.value }))}
          placeholder={tour ? buildTourPublicUrl(tour.id) : "Kayıt sonrası otomatik oluşur"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">
            Süre{" "}
            <span className="text-xs text-muted-foreground">
              (listeden seç veya elle yaz)
            </span>
          </Label>
          <Input
            id="duration"
            list="duration-options"
            value={formData.duration}
            onChange={(e) =>
              setFormData((p) => ({ ...p, duration: e.target.value }))
            }
            placeholder="Örn: 1 Saat, 5 Saat, Yarım Gün"
          />
          <datalist id="duration-options">
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.label} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_price">Varsayılan Fiyat</Label>
          <div className="flex gap-2">
            <Input
              id="default_price"
              type="number"
              min={0}
              step="1"
              placeholder="0"
              value={formData.default_price === 0 ? "" : formData.default_price}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  default_price: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="flex-1"
            />
            <Select
              value={formData.currency}
              onValueChange={(val) =>
                setFormData((p) => ({ ...p, currency: val as CurrencyType }))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3 bg-slate-50">
        <Label className="text-sm font-semibold">Kalkış & Buluşma (Katalog PDF)</Label>
        <div className="space-y-2">
          <Label className="text-xs">Kalkış Günleri</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["monday", "Pzt"],
                ["tuesday", "Sal"],
                ["wednesday", "Çar"],
                ["thursday", "Per"],
                ["friday", "Cum"],
                ["saturday", "Cmt"],
                ["sunday", "Paz"],
              ] as const
            ).map(([key, label]) => {
              const active = formData.departure_days.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      departure_days: active
                        ? p.departure_days.filter((d) => d !== key)
                        : [...p.departure_days, key],
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="departure_time" className="text-xs">
              Kalkış Saati
            </Label>
            <Input
              id="departure_time"
              type="time"
              value={formData.departure_time}
              onChange={(e) =>
                setFormData((p) => ({ ...p, departure_time: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meeting_point" className="text-xs">
              Buluşma Noktası
            </Label>
            <Input
              id="meeting_point"
              placeholder="Bodrum Marina Liman Girişi"
              value={formData.meeting_point}
              onChange={(e) =>
                setFormData((p) => ({ ...p, meeting_point: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>EasyBook Taban Fiyatları</Label>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["base_price_adult_eur", "Yetişkin EUR"],
              ["base_price_child_eur", "Çocuk EUR"],
              ["base_price_adult_try", "Yetişkin TL"],
              ["base_price_child_try", "Çocuk TL"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={formData[key] === 0 ? "" : formData[key]}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [key]: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Alış Bölgeleri (Pickup Zones) — bölgeye göre saat + buluşma noktası tablosu.
           Rafting gibi çoğu noktadan transfer yapan turlarda kullanılır; boş bırakılırsa
           yukarıdaki "Buluşma Noktası" + "Kalkış Saati" alanları geçerli kalır. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label>Alış Bölgeleri</Label>
            <p className="text-xs text-muted-foreground">
              Bölgeye göre farklı kalkış saati ve buluşma noktası — örn. Rafting transferi
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFormData((p) => ({
                ...p,
                pickup_zones: [
                  ...p.pickup_zones,
                  { region: "", time: "", meeting_point: "" },
                ],
              }))
            }
          >
            + Bölge Ekle
          </Button>
        </div>
        {formData.pickup_zones.length > 0 && (
          <div className="grid grid-cols-[1fr_110px_1.4fr_40px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
            <span>Bölge</span>
            <span>Saat</span>
            <span>Buluşma Yeri</span>
            <span />
          </div>
        )}
        {formData.pickup_zones.map((zone, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_110px_1.4fr_40px] gap-2"
          >
            <Input
              placeholder="Bodrum Merkez"
              value={zone.region}
              onChange={(e) => {
                const zs = [...formData.pickup_zones];
                zs[index] = { ...zs[index], region: e.target.value };
                setFormData((p) => ({ ...p, pickup_zones: zs }));
              }}
            />
            <Input
              type="time"
              value={zone.time}
              onChange={(e) => {
                const zs = [...formData.pickup_zones];
                zs[index] = { ...zs[index], time: e.target.value };
                setFormData((p) => ({ ...p, pickup_zones: zs }));
              }}
            />
            <Input
              placeholder="Otel Önü"
              value={zone.meeting_point}
              onChange={(e) => {
                const zs = [...formData.pickup_zones];
                zs[index] = { ...zs[index], meeting_point: e.target.value };
                setFormData((p) => ({ ...p, pickup_zones: zs }));
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  pickup_zones: p.pickup_zones.filter((_, i) => i !== index),
                }))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tur Sorumluları</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFormData((p) => ({
                ...p,
                tour_managers: [...p.tour_managers, { name: "", phone: "" }],
              }))
            }
          >
            + Sorumlu Ekle
          </Button>
        </div>
        {formData.tour_managers.map((manager, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Ad Soyad"
              value={manager.name}
              onChange={(e) => {
                const m = [...formData.tour_managers];
                m[index].name = e.target.value;
                setFormData((p) => ({ ...p, tour_managers: m }));
              }}
              className="flex-1"
            />
            <Input
              placeholder="Telefon"
              value={manager.phone}
              onChange={(e) => {
                const m = [...formData.tour_managers];
                m[index].phone = e.target.value;
                setFormData((p) => ({ ...p, tour_managers: m }));
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  tour_managers: p.tour_managers.filter((_, i) => i !== index),
                }))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
          className="h-4 w-4"
        />
        <Label htmlFor="is_active">Aktif</Label>
      </div>

      {saveResult ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            saveResult.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {saveResult.text}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-4 border-t">
        {!isPage && (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </div>
  );

  if (isPage) {
    if (!visible) return null;
    return formBody;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Tur Düzenle" : "Yeni Tur"}</DialogTitle>
        </DialogHeader>
        {formBody}
        <DialogFooter className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
