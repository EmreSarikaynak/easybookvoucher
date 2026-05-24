"use client";

import Image from "next/image";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  normalizeTourTranslations,
  addAgencyCodeToUrl,
  buildTourPublicUrl,
} from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";
import type { ResolvedTourPriceSet } from "@/lib/tour-catalog-data";
import { TourPriceBlock } from "./tour-price-block";

interface TourViewPanelProps {
  tour: Tour;
  prices?: ResolvedTourPriceSet | null;
  agencyCode?: string | null;
}

export function TourViewPanel({ tour, prices, agencyCode }: TourViewPanelProps) {
  const [copied, setCopied] = useState(false);
  const publicUrl = tour.tour_url
    ? addAgencyCodeToUrl(tour.tour_url, agencyCode)
    : buildTourPublicUrl(tour.id, undefined, agencyCode);
  const translations = normalizeTourTranslations(
    tour.translations,
    tour.name,
    tour.description
  );

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("URL kopyalanamadı");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
        <Label className="text-muted-foreground">Müşteri sayfası URL</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <code className="text-sm break-all flex-1 min-w-0 bg-background px-3 py-2 rounded border">
            {publicUrl}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Kopyalandı
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Kopyala
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground">Satış fiyatları</Label>
        <TourPriceBlock prices={prices} size="md" />
        {tour.duration && (
          <div className="pt-1">
            <Label className="text-muted-foreground">Süre</Label>
            <p className="mt-1">{tour.duration}</p>
          </div>
        )}
      </div>

      {tour.images && tour.images.length > 0 && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Fotoğraflar</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tour.images.map((img, i) => (
              <div key={img} className="relative aspect-video rounded-md overflow-hidden border">
                <Image src={img} alt={`${tour.name} ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {TOUR_LANGUAGES.map((lang) => {
        const t = translations[lang];
        if (!t?.name?.trim() && !t?.description?.trim()) return null;
        return (
          <div key={lang} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span>{TOUR_LANG_FLAGS[lang]}</span>
              <span className="font-semibold">{TOUR_LANG_LABELS[lang]}</span>
            </div>
            {t.name && <p className="font-medium">{t.name}</p>}
            {t.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.description}</p>
            )}
            {t.highlights?.some((h) => h.trim()) && (
              <ul className="text-sm list-disc pl-5 space-y-1">
                {t.highlights.filter((h) => h.trim()).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {tour.videos && tour.videos.length > 0 && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Videolar</Label>
          <ul className="space-y-1 text-sm">
            {tour.videos.map((v, i) => (
              <li key={i}>
                <a
                  href={v}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all"
                >
                  {v}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tour.tour_managers && tour.tour_managers.length > 0 && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Tur sorumluları</Label>
          <ul className="space-y-1 text-sm">
            {tour.tour_managers.map((m, i) => (
              <li key={i}>
                {m.name}
                {m.phone ? ` — ${m.phone}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Badge variant={tour.is_active ? "success" : "secondary"}>
        {tour.is_active ? "Aktif" : "Pasif"}
      </Badge>
    </div>
  );
}
