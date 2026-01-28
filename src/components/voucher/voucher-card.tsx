"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Voucher, VoucherStatus } from "@/lib/types";
import { formatDateShort, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";

const statusVariant: Record<VoucherStatus, "success" | "destructive" | "secondary"> = {
  active: "success",
  cancelled: "destructive",
  completed: "secondary",
};

interface VoucherCardProps {
  voucher: Voucher;
}

export function VoucherCard({ voucher }: VoucherCardProps) {
  return (
    <Link href={`/dashboard/vouchers/${voucher.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <p className="text-sm font-bold">{voucher.voucher_no}</p>
            <p className="text-sm text-muted-foreground">
              {voucher.customer_name}
            </p>
          </div>
          <Badge variant={statusVariant[voucher.status]}>
            {STATUS_LABELS[voucher.status]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateShort(voucher.tour_date)}</span>
          </div>
          {voucher.tour && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{voucher.tour.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {voucher.pax_adult}Y
              {voucher.pax_child > 0 && ` + ${voucher.pax_child}\u00C7`}
              {voucher.pax_infant > 0 && ` + ${voucher.pax_infant}B`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" />
            <span>{formatCurrency(voucher.total_price, voucher.currency)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
