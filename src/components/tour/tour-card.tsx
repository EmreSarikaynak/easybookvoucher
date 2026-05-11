"use client";

import Image from "next/image";
import { Edit, Trash2, DollarSign, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Tour } from "@/lib/types";

interface TourCardProps {
  tour: Tour;
  isAdmin?: boolean;
  onEdit?: (tour: Tour) => void;
  onDelete?: (tour: Tour) => void;
  onManagePrices?: (tour: Tour) => void;
}

export function TourCard({
  tour,
  isAdmin = false,
  onEdit,
  onDelete,
  onManagePrices,
}: TourCardProps) {
  const coverImage = tour.images?.[0];

  return (
    <Card className="overflow-hidden">
      {/* Cover Image */}
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

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Varsayılan Fiyat:</span>
          <span className="font-semibold">
            {formatCurrency(tour.default_price, tour.currency)}
          </span>
        </div>

        {tour.duration && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Süre:</span>
            <span>{tour.duration}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isAdmin && onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(tour)}>
              <Edit className="mr-1 h-3 w-3" />
              Düzenle
            </Button>
          )}
          {onManagePrices && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManagePrices(tour)}
            >
              <DollarSign className="mr-1 h-3 w-3" />
              Fiyatlar
            </Button>
          )}
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
