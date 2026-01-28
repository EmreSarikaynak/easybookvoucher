"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Printer, XCircle } from "lucide-react";
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
import type { Voucher, VoucherStatus } from "@/lib/types";

const statusVariant: Record<VoucherStatus, "success" | "destructive" | "secondary"> = {
  active: "success",
  cancelled: "destructive",
  completed: "secondary",
};

export default function VoucherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      const { data } = await supabase
        .from("vouchers")
        .select(
          `
          *,
          tour:tours(*),
          sales_person:profiles!vouchers_sales_person_id_fkey(*),
          agency:agencies(*)
        `
        )
        .eq("id", params.id as string)
        .single();

      setVoucher(data);
      setLoading(false);
    };

    if (params.id) fetchVoucher();
  }, [params.id, supabase]);

  const handleCancel = async () => {
    if (!voucher) return;
    if (!confirm("Bu voucher'\u0131 iptal etmek istedi\u011Finize emin misiniz?")) return;

    await supabase
      .from("vouchers")
      .update({ status: "cancelled" })
      .eq("id", voucher.id);

    setVoucher({ ...voucher, status: "cancelled" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-semibold">Voucher bulunamad&#305;</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Geri D&ouml;n
        </Button>
      </div>
    );
  }

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
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Yazd&#305;r
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            D&uuml;zenle
          </Button>
          {voucher.status === "active" && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="mr-2 h-4 w-4" />
              &#304;ptal Et
            </Button>
          )}
        </div>
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
            <DetailRow label="Al\u0131\u015F Noktas\u0131" value={voucher.pickup_place ?? "-"} />
            <DetailRow label="Al\u0131\u015F Saati" value={voucher.pickup_time ?? "-"} />
          </CardContent>
        </Card>

        {/* Misafir Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Misafir Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Misafir" value={voucher.customer_name} />
            <DetailRow label="Otel" value={voucher.hotel ?? "-"} />
            <DetailRow label="Oda No" value={voucher.room_no ?? "-"} />
            <DetailRow
              label="Ki\u015Fi Say\u0131s\u0131"
              value={`${voucher.pax_adult}Y${voucher.pax_child > 0 ? ` + ${voucher.pax_child}\u00C7` : ""}${voucher.pax_infant > 0 ? ` + ${voucher.pax_infant}B` : ""}`}
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
              label="\u00D6n \u00D6deme"
              value={formatCurrency(voucher.deposit_paid, voucher.currency)}
            />
            <Separator />
            <DetailRow
              label="Kalan"
              value={formatCurrency(voucher.rest_to_pay, voucher.currency)}
              bold
            />
          </CardContent>
        </Card>

        {/* Di\u011Fer Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Di\u011Fer Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Sat\u0131c\u0131" value={voucher.sales_person?.full_name ?? "-"} />
            <DetailRow label="Acente" value={voucher.agency?.name ?? "-"} />
            <DetailRow label="Olu\u015Fturulma" value={formatDateShort(voucher.created_at)} />
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
