"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, CreditCard, Eye, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Voucher, VoucherStatus } from "@/lib/types";
import { formatDateShort, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import { getVoucherJpegUrl } from "@/lib/voucher-assets";

const statusVariant: Record<VoucherStatus, "success" | "destructive" | "secondary"> = {
  active: "success",
  cancelled: "destructive",
  completed: "secondary",
};

interface VoucherCardProps {
  voucher: Voucher;
}

export function VoucherCard({ voucher }: VoucherCardProps) {
  const jpegUrl = getVoucherJpegUrl(voucher.pdf_url);

  return (
    <Card className="transition-all hover:shadow-md active:scale-[0.98] touch-manipulation">
      <CardContent className="p-4">
        <Link href={`/vouchers/${voucher.id}`} className="block">
          {/* Üst kısım: Bilet no, müşteri adı, durum */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-base truncate">{voucher.voucher_no}</p>
              <p className="text-sm text-muted-foreground truncate">
                {voucher.customer_name}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={statusVariant[voucher.status]} className="text-xs">
                {STATUS_LABELS[voucher.status]}
              </Badge>
            </div>
          </div>

          {/* Alt kısım: Detaylar grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="truncate">{formatDateShort(voucher.tour_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                {voucher.pax_adult}Y
                {voucher.pax_child > 0 && ` + ${voucher.pax_child}Ç`}
                {voucher.pax_infant > 0 && ` + ${voucher.pax_infant}B`}
              </span>
            </div>
            {voucher.tour && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{voucher.tour.name}</span>
              </div>
            )}
          </div>

          {/* Fiyat - Vurgulu */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Toplam</span>
            </div>
            <span className="font-bold text-lg">
              {formatCurrency(voucher.total_price, voucher.currency)}
            </span>
          </div>
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/vouchers/${voucher.id}`}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Bileti Gör
            </Link>
          </Button>
          {jpegUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={jpegUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                JPEG
              </a>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/vouchers/${voucher.id}`}>JPEG Oluştur</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
