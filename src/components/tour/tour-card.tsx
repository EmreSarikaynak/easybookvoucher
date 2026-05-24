"use client";

import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2, ImageIcon, ExternalLink, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addAgencyCodeToUrl, buildTourPublicUrl } from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";
import type { ResolvedTourPriceSet } from "@/lib/tour-catalog-data";
import { TourPriceBlock } from "./tour-price-block";

interface TourCardProps {
  tour: Tour;
  isAdmin?: boolean;
  prices?: ResolvedTourPriceSet;
  agencyCode?: string | null;
  onEdit?: (tour: Tour) => void;
  onDelete?: (tour: Tour) => void;
}

export function TourCard({
  tour,
  isAdmin = false,
  prices,
  agencyCode,
  onEdit,
  onDelete,
}: TourCardProps) {
  const coverImage = tour.images?.[0];
  const publicUrl = tour.tour_url
    ? addAgencyCodeToUrl(tour.tour_url, agencyCode)
    : buildTourPublicUrl(tour.id, undefined, agencyCode);
  const pdfUrl = `/api/tours/${tour.id}/pdf?lang=tr${
    agencyCode ? `&a=${encodeURIComponent(agencyCode)}` : ""
  }`;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={tour.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{tour.name}</CardTitle>
          <Badge variant={tour.is_active ? "success" : "secondary"}>
            {tour.is_active ? "Aktif" : "Pasif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {tour.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tour.description}
          </p>
        )}

        <TourPriceBlock prices={prices} size="sm" />

        {tour.duration && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Süre:</span>
            <span>{tour.duration}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {isAdmin ? (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/tours/${tour.id}`}>
                  <Edit className="mr-1 h-3 w-3" />
                  Düzenle
                </Link>
              </Button>
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(tour)}>
                  Hızlı Düzenle
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="default" asChild>
              <Link href={`/tours/${tour.id}`}>
                <Eye className="mr-1 h-3 w-3" />
                Görüntüle
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" />
              URL
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-1 h-3 w-3" />
              PDF
            </a>
          </Button>
          {isAdmin && onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(tour)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Sil
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
