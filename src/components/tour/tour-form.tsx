"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, Upload, GripVertical } from "lucide-react";
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
import { createTour, updateTour, uploadTourImages } from "@/app/actions/tour";
import {
  DURATION_OPTIONS,
  CURRENCY_OPTIONS,
  type Tour,
  type CurrencyType,
} from "@/lib/types";
import { DEFAULT_TOUR_URL } from "@/lib/constants";

interface TourFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour?: Tour | null;
  onSave: () => void;
}

export function TourForm({ open, onOpenChange, tour, onSave }: TourFormProps) {
  const isEditing = !!tour;

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    default_price: 0,
    currency: "EUR" as CurrencyType,
    pickup_locations: [] as string[],
    images: [] as string[],
    tour_url: DEFAULT_TOUR_URL,
    is_active: true,
    tour_managers: [] as { name: string; phone: string }[],
    base_price_adult_eur: 0,
    base_price_child_eur: 0,
    base_price_adult_try: 0,
    base_price_child_try: 0,
  });

  // Reset form when tour changes or dialog opens
  useEffect(() => {
    if (open) {
      if (tour) {
        setFormData({
          name: tour.name,
          description: tour.description ?? "",
          duration: tour.duration ?? "",
          default_price: tour.default_price,
          currency: tour.currency,
          pickup_locations: tour.pickup_locations ?? [],
          images: tour.images ?? [],
          tour_url: tour.tour_url ?? "",
          is_active: tour.is_active,
          tour_managers: tour.tour_managers ?? [],
          base_price_adult_eur: tour.base_price_adult_eur ?? 0,
          base_price_child_eur: tour.base_price_child_eur ?? 0,
          base_price_adult_try: tour.base_price_adult_try ?? 0,
          base_price_child_try: tour.base_price_child_try ?? 0,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          duration: "",
          default_price: 0,
          currency: "EUR",
          pickup_locations: [],
          images: [],
          tour_url: DEFAULT_TOUR_URL,
          is_active: true,
          tour_managers: [],
          base_price_adult_eur: 0,
          base_price_child_eur: 0,
          base_price_adult_try: 0,
          base_price_child_try: 0,
        });
      }
    }
  }, [open, tour]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploadingImages(true);

      try {
        const formDataUpload = new FormData();
        for (const file of Array.from(files)) {
          formDataUpload.append("files", file);
        }

        // Clear input after processing files to FormData
        e.target.value = "";

        const result = await uploadTourImages(formDataUpload);

        if (result.error) {
          alert(result.error);
          return;
        }

        if (result.urls?.length) {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, ...(result.urls || [])],
          }));
        }
      } catch (error) {
        console.error("Image upload error:", error);
        alert("Resim yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
        setUploadingImages(false);
      }
    },
    []
  );

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert("Tur adı zorunludur!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        duration: formData.duration || null,
        default_price: formData.default_price,
        currency: formData.currency,
        pickup_locations: formData.pickup_locations,
        images: formData.images,
        tour_url: formData.tour_url || null,
        is_active: formData.is_active,
        tour_managers: formData.tour_managers,
        base_price_adult_eur: formData.base_price_adult_eur,
        base_price_child_eur: formData.base_price_child_eur,
        base_price_adult_try: formData.base_price_adult_try,
        base_price_child_try: formData.base_price_child_try,
      };

      const result = isEditing && tour
        ? await updateTour(tour.id, payload)
        : await createTour(payload);

      if (result.error) {
        alert(result.error);
        return;
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("Kaydetme sırasında bir hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Tur Düzenle" : "Yeni Tur"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tour Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Tur Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Ör: Efes Antik Kenti Turu"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Tur açıklaması..."
            />
          </div>

          {/* Tour URL */}
          <div className="space-y-2">
            <Label htmlFor="tour_url">
              Tur Detay URL{" "}
              <span className="text-xs text-muted-foreground">
                (Bilet üzerinde QR kod olarak görünecek)
              </span>
            </Label>
            <Input
              id="tour_url"
              type="url"
              value={formData.tour_url}
              onChange={(e) =>
                setFormData((p) => ({ ...p, tour_url: e.target.value }))
              }
              placeholder={DEFAULT_TOUR_URL}
            />
            <p className="text-xs text-muted-foreground mt-1">
              ℹ️ Alan boş bırakılırsa bilet QR kodu varsayılan olarak YouTube kanalımıza yönlendirilir.
            </p>
          </div>

          {/* Duration & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Süre</Label>
              <Select
                value={formData.duration}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, duration: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Süre seçin" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_price">Varsayılan Fiyat</Label>
              <div className="flex gap-2">
                <Input
                  id="default_price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.default_price}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      default_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="flex-1"
                />
                <Select
                  value={formData.currency}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      currency: val as CurrencyType,
                    }))
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

          {/* EasyBook Base Prices */}
          <div className="space-y-2">
            <Label>
              EasyBook Taban Fiyatları{" "}
              <span className="text-xs text-muted-foreground">
                (Acente borç hesabında kullanılır)
              </span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="base_price_adult_eur" className="text-xs text-blue-700">Yetişkin EUR</Label>
                <Input
                  id="base_price_adult_eur"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.base_price_adult_eur}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      base_price_adult_eur: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="base_price_child_eur" className="text-xs text-blue-700">Çocuk EUR</Label>
                <Input
                  id="base_price_child_eur"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.base_price_child_eur}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      base_price_child_eur: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="base_price_adult_try" className="text-xs text-muted-foreground">Yetişkin TL</Label>
                <Input
                  id="base_price_adult_try"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.base_price_adult_try}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      base_price_adult_try: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="base_price_child_try" className="text-xs text-muted-foreground">Çocuk TL</Label>
                <Input
                  id="base_price_child_try"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.base_price_child_try}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      base_price_child_try: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Tour Managers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tur Sorumluları (Opsiyonel)</Label>
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
            <div className="space-y-2">
              {formData.tour_managers.map((manager, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Ad Soyad"
                    value={manager.name}
                    onChange={(e) => {
                      const newManagers = [...formData.tour_managers];
                      newManagers[index].name = e.target.value;
                      setFormData((p) => ({ ...p, tour_managers: newManagers }));
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Telefon (Ör: +90 536 602 93 97)"
                    value={manager.phone}
                    onChange={(e) => {
                      const newManagers = [...formData.tour_managers];
                      newManagers[index].phone = e.target.value;
                      setFormData((p) => ({ ...p, tour_managers: newManagers }));
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const newManagers = formData.tour_managers.filter((_, i) => i !== index);
                      setFormData((p) => ({ ...p, tour_managers: newManagers }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>
              Tur Resimleri{" "}
              <span className="text-xs text-muted-foreground">
                (İlk resim kapak fotoğrafıdır)
              </span>
            </Label>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {formData.images.map((img, index) => (
                  <div
                    key={img}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 ${index === 0 ? "border-primary" : "border-transparent"
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`Tur resmi ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                        Kapak
                      </div>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(index, 0)}
                          className="bg-white/80 hover:bg-white p-1 rounded"
                          title="Kapak yap"
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="bg-white/80 hover:bg-white p-1 rounded"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button - birden fazla resim seçilebilir */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImages}
                />
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors disabled:opacity-50">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {uploadingImages ? "Yükleniyor..." : "Resim Yükle (JPG, PNG, WEBP)"}
                  </span>
                </div>
              </label>
              <span className="text-xs text-muted-foreground">
                Birden fazla resim seçebilirsiniz (dosya seçerken Ctrl veya Cmd ile çoklu seçim).
              </span>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((p) => ({ ...p, is_active: e.target.checked }))
              }
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">Aktif</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
