"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TourForm } from "@/components/tour/tour-form";
import { TourViewPanel } from "@/components/tour/tour-view-panel";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  addAgencyCodeToUrl,
  buildTourPublicUrl,
} from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";
import type { ResolvedTourPriceSet } from "@/lib/tour-catalog-data";

interface TourDetailClientProps {
  tour: Tour;
  isAdmin: boolean;
  prices?: ResolvedTourPriceSet | null;
  agencyCode?: string | null;
}

export function TourDetailClient({
  tour,
  isAdmin,
  prices,
  agencyCode,
}: TourDetailClientProps) {
  const router = useRouter();
  const publicUrl = tour.tour_url
    ? addAgencyCodeToUrl(tour.tour_url, agencyCode)
    : buildTourPublicUrl(tour.id, undefined, agencyCode);

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
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Tur detay ve içerik yönetimi" : "Tur bilgileri (salt okunur)"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Müşteri Sayfası
            </a>
          </Button>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Düzenle</TabsTrigger>
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
            <TourPreviewSection tourId={tour.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="info" className="w-full">
          <TabsList>
            <TabsTrigger value="info">Tur Bilgileri</TabsTrigger>
            <TabsTrigger value="preview">Önizleme & PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <div className="rounded-lg border bg-card p-6">
              <TourViewPanel tour={tour} prices={prices} agencyCode={agencyCode} />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-6 space-y-4">
            <TourPreviewSection tourId={tour.id} agencyCode={agencyCode} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function TourPreviewSection({
  tourId,
  agencyCode,
}: {
  tourId: string;
  agencyCode?: string | null;
}) {
  const agencyQuery = agencyCode ? `&a=${encodeURIComponent(agencyCode)}` : "";
  const previewSrc = `/tour/${tourId}${agencyCode ? `?a=${encodeURIComponent(agencyCode)}` : ""}`;

  return (
    <>
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold">PDF Broşür İndir</h3>
        <div className="flex flex-wrap gap-2">
          {TOUR_LANGUAGES.map((lang) => (
            <Button key={lang} variant="outline" asChild>
              <a
                href={`/api/tours/${tourId}/pdf?lang=${lang}${agencyQuery}`}
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
          src={previewSrc}
          title="Tur önizleme"
          className="w-full h-[min(70vh,800px)] border-0"
        />
      </div>
    </>
  );
}
