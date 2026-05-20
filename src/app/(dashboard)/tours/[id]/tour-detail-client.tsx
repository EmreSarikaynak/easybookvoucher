"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TourForm } from "@/components/tour/tour-form";
import { TourPrices } from "@/components/tour/tour-prices";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  buildTourPublicUrl,
} from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";
import { useState } from "react";

interface TourDetailClientProps {
  tour: Tour;
  isAdmin: boolean;
  userAgencyId: string | null;
}

export function TourDetailClient({
  tour,
  isAdmin,
  userAgencyId,
}: TourDetailClientProps) {
  const router = useRouter();
  const [pricesOpen, setPricesOpen] = useState(false);
  const publicUrl = tour.tour_url || buildTourPublicUrl(tour.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tours">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{tour.name}</h1>
            <p className="text-sm text-muted-foreground">Tur detay ve içerik yönetimi</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Müşteri Sayfası
            </a>
          </Button>
          {(isAdmin || userAgencyId) && (
            <Button variant="outline" onClick={() => setPricesOpen(true)}>
              Fiyatlar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">İçerik & Medya</TabsTrigger>
          <TabsTrigger value="preview">Önizleme & PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <div className="rounded-lg border bg-card p-6">
            <TourForm
              open={true}
              onOpenChange={() => {}}
              tour={tour}
              variant="page"
              onSave={() => router.refresh()}
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6 space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">PDF Broşür İndir</h3>
            <div className="flex flex-wrap gap-2">
              {TOUR_LANGUAGES.map((lang) => (
                <Button key={lang} variant="outline" asChild>
                  <a
                    href={`/api/tours/${tour.id}/pdf?lang=${lang}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF {TOUR_LANG_FLAGS[lang]}
                  </a>
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <p className="text-sm text-muted-foreground p-3 border-b bg-muted/50">
              Müşteri görünümü önizlemesi
            </p>
            <iframe
              src={`/tour/${tour.id}`}
              title="Tur önizleme"
              className="w-full h-[min(70vh,800px)] border-0"
            />
          </div>
        </TabsContent>
      </Tabs>

      <TourPrices
        open={pricesOpen}
        onOpenChange={setPricesOpen}
        tour={tour}
        agencyId={isAdmin ? null : userAgencyId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
