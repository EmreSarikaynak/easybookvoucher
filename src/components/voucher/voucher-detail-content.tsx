"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase";
import { formatDateShort, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import { VoucherActions } from "@/components/voucher/voucher-actions";
import type { Voucher, VoucherStatus } from "@/lib/types";

const statusVariant: Record<VoucherStatus, "success" | "destructive" | "secondary"> = {
  active: "success",
  cancelled: "destructive",
  completed: "secondary",
};

interface VoucherDetailContentProps {
  voucher: Voucher;
}

export function VoucherDetailContent({ voucher: initialVoucher }: VoucherDetailContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [voucher, setVoucher] = useState<Voucher>(initialVoucher);

  const handleCancel = async () => {
    if (!confirm("Bu bileti iptal etmek istediğinize emin misiniz?")) return;

    const { error } = await supabase
      .from("vouchers")
      .update({ status: "cancelled" })
      .eq("id", voucher.id);

    if (!error) {
      setVoucher({ ...voucher, status: "cancelled" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{voucher.voucher_no}</h1>
            <p className="text-muted-foreground">{voucher.customer_name}</p>
          </div>
          <Badge variant={statusVariant[voucher.status]}>
            {STATUS_LABELS[voucher.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vouchers/${voucher.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Link>
          </Button>
          {voucher.status === "active" && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="mr-2 h-4 w-4" />
              İptal Et
            </Button>
          )}
        </div>
      </div>

      {/* Bilet ve Paylaşım Butonları */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Bilet Önizleme</h2>
        <VoucherActions voucher={voucher} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tur Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tur Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Tur" value={voucher.tour?.name ?? "-"} />
            <DetailRow label="Tur Tarihi" value={formatDateShort(voucher.tour_date)} />
            <DetailRow label="Alış Noktası" value={voucher.pickup_place ?? "-"} />
            <DetailRow label="Alış Saati" value={voucher.pickup_time ?? "-"} />
          </CardContent>
        </Card>

        {/* Misafir Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Misafir Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Misafir" value={voucher.customer_name} />
            <DetailRow label="Telefon" value={voucher.customer_phone ?? "-"} />
            <DetailRow label="Otel" value={voucher.hotel ?? "-"} />
            <DetailRow label="Oda No" value={voucher.room_no ?? "-"} />
            <DetailRow
              label="Kişi Sayısı"
              value={`${voucher.pax_adult}Y${voucher.pax_child > 0 ? ` + ${voucher.pax_child}Ç` : ""}${voucher.pax_infant > 0 ? ` + ${voucher.pax_infant}B` : ""}`}
            />
          </CardContent>
        </Card>

        {/* Fiyat Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fiyat Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="Toplam Fiyat"
              value={formatCurrency(voucher.total_price, voucher.currency)}
            />
            <DetailRow
              label="Ön Ödeme"
              value={formatCurrency(voucher.deposit_paid, voucher.currency)}
            />
            <Separator />
            <DetailRow
              label="Rest"
              value={formatCurrency(voucher.rest_to_pay, voucher.currency)}
              bold
            />
          </CardContent>
        </Card>

        {/* Diğer Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diğer Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Satıcı" value={voucher.sales_person?.full_name ?? "-"} />
            <DetailRow label="Acente" value={voucher.agency?.name ?? "-"} />
            <DetailRow label="Oluşturulma" value={formatDateShort(voucher.created_at)} />
            {voucher.notes && <DetailRow label="Notlar" value={voucher.notes} />}
          </CardContent>
        </Card>
      </div>


    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
