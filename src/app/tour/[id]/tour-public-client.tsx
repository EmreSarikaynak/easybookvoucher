"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  MapPin,
  Phone,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTourContentForLang,
  getTourPageUi,
  getYoutubeEmbedUrl,
  isYoutubeUrl,
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  type TourLang,
} from "@/lib/tour-i18n";
import { EASYBOOK_CONTACT } from "@/lib/constants";
import type { Tour } from "@/lib/types";

interface TourPublicClientProps {
  tour: Tour;
}

export function TourPublicClient({ tour }: TourPublicClientProps) {
  const [lang, setLang] = useState<TourLang>("tr");
  const [photoIndex, setPhotoIndex] = useState(0);

  const ui = getTourPageUi(lang);
  const content = getTourContentForLang(
    tour.translations,
    lang,
    tour.name,
    tour.description
  );
  const images = tour.images ?? [];
  const videos = tour.videos ?? [];

  const pdfUrl = `/api/tours/${tour.id}/pdf?lang=${lang}`;

  const prevPhoto = () => {
    if (images.length) setPhotoIndex((i) => (i - 1 + images.length) % images.length);
  };
  const nextPhoto = () => {
    if (images.length) setPhotoIndex((i) => (i + 1) % images.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              EASY BOOK TOURS
            </p>
            <h1 className="text-lg font-bold line-clamp-1">{content.name}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">{ui.selectLanguage}</span>
            <div className="flex gap-1">
              {TOUR_LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-md text-sm border transition-colors ${
                    lang === l
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                  title={TOUR_LANG_LABELS[l]}
                >
                  {TOUR_LANG_FLAGS[l]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {images.length > 0 && (
          <section>
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-muted shadow-lg">
              <Image
                src={images[photoIndex]}
                alt={content.name}
                fill
                className="object-cover"
                priority
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full ${
                          i === photoIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    className={`relative w-20 h-14 shrink-0 rounded-md overflow-hidden border-2 ${
                      i === photoIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="flex flex-wrap gap-3 items-center">
          {tour.duration && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {ui.duration}: {tour.duration}
            </Badge>
          )}
          <Button asChild>
            <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              {ui.downloadPdf}
            </a>
          </Button>
        </section>

        <section className="prose prose-slate max-w-none">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {content.description?.trim() || ui.noDescription}
          </p>
        </section>

        {content.highlights?.some((h) => h.trim()) && (
          <section>
            <h2 className="text-xl font-semibold mb-3">{ui.highlights}</h2>
            <ul className="space-y-2">
              {content.highlights
                .filter((h) => h.trim())
                .map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {tour.pickup_locations?.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {ui.pickupLocations}
            </h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              {tour.pickup_locations.map((loc) => (
                <li key={loc}>• {loc}</li>
              ))}
            </ul>
          </section>
        )}

        {videos.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              {ui.videos}
            </h2>
            <div className="space-y-4">
              {videos.map((url, i) => {
                const embed = isYoutubeUrl(url) ? getYoutubeEmbedUrl(url) : null;
                if (embed) {
                  return (
                    <div key={i} className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={embed}
                        title={`Video ${i + 1}`}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  );
                }
                return (
                  <video
                    key={i}
                    src={url}
                    controls
                    className="w-full rounded-xl max-h-[400px] bg-black"
                  />
                );
              })}
            </div>
          </section>
        )}

        {tour.tour_managers && tour.tour_managers.length > 0 && (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-lg font-semibold mb-3">{ui.tourManagers}</h2>
            <ul className="space-y-2">
              {tour.tour_managers.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{m.name}</span>
                  {m.phone && (
                    <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="text-primary">
                      {m.phone}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="text-center py-8 border-t text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{ui.since}</p>
          <p className="mt-1">{EASYBOOK_CONTACT.phoneDisplay}</p>
          <p>{EASYBOOK_CONTACT.website}</p>
        </footer>
      </main>
    </div>
  );
}
