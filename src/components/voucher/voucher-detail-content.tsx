"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, XCircle, RefreshCcw, Trash2, Copy, ExternalLink, Check, ImageIcon, Loader2 } from "lucide-react";
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
import { getVoucherJpegUrl } from "@/lib/voucher-assets";

const statusVariant: Record<VoucherStatus, "success" | "destructive" | "secondary"> = {
  active: "success",
  cancelled: "destructive",
  completed: "secondary",
};

interface VoucherDetailContentProps {
  voucher: Voucher;
  isAdmin?: boolean;
  isNewVoucher?: boolean;
  isRevisedVoucher?: boolean;
}

export function VoucherDetailContent({ voucher: initialVoucher, isAdmin, isNewVoucher, isRevisedVoucher }: VoucherDetailContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [voucher, setVoucher] = useState<Voucher>(initialVoucher);
  const [copied, setCopied] = useState(false);
  const [copiedJpeg, setCopiedJpeg] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const jpegUrl = getVoucherJpegUrl(voucher.pdf_url);

  const handleCopyLink = () => {
    if (!voucher.pdf_url) return;
    navigator.clipboard.writeText(voucher.pdf_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJpegLink = () => {
    if (!jpegUrl) return;
    navigator.clipboard.writeText(jpegUrl);
    setCopiedJpeg(true);
    setTimeout(() => setCopiedJpeg(false), 2000);
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Bu bileti iptal etmek istediğinize emin misiniz?\n\n" +
          "Müşteri, acente ve admin'lere WhatsApp bildirimi gönderilecektir."
      )
    )
      return;

    setIsCancelling(true);
    try {
      const res = await fetch("/api/vouchers/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: voucher.id }),
      });

      let result: {
        success?: boolean;
        sent?: number;
        failed?: number;
        error?: string;
        notificationsError?: string;
      };
      try {
        result = await res.json();
      } catch {
        result = { success: false, error: `HTTP ${res.status}` };
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || `HTTP ${res.status}`);
      }

      setVoucher({ ...voucher, status: "cancelled" });

      const sentMsg =
        typeof result.sent === "number"
          ? ` ${result.sent} WhatsApp bildirimi gönderildi${result.failed && result.failed > 0 ? `, ${result.failed} başarısız` : ""}.`
          : "";
      const warning = result.notificationsError
        ? `\n\nUyarı: bazı bildirimler iletilemedi (${result.notificationsError}).`
        : "";
      alert(`Bilet iptal edildi.${sentMsg}${warning}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("İptal sırasında hata: " + msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm("Bu bileti tekrar aktif etmek istediğinize emin misiniz?")) return;

    const { error } = await supabase
      .from("vouchers")
      .update({ status: "active" })
      .eq("id", voucher.id);

    if (!error) {
      setVoucher({ ...voucher, status: "active" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu bileti SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;

    const { error } = await supabase
      .from("vouchers")
      .delete()
      .eq("id", voucher.id);

    if (!error) {
      router.push("/vouchers");
    } else {
      alert("Silinirken bir hata oluştu!");
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
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {isCancelling ? "İptal Ediliyor..." : "İptal Et"}
            </Button>
          )}
          {voucher.status === "cancelled" && isAdmin && (
            <Button variant="default" size="sm" onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Aktif Et
            </Button>
          )}
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="bg-red-700 hover:bg-red-800">
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </Button>
          )}
        </div>
      </div>

      {/* Bilet ve Paylaşım Butonları */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Bilet Önizleme</h2>
        
        {/* PDF Link Card */}
        {voucher.pdf_url && (
          <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      PDF Bilet URL
                    </span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground select-all truncate bg-white dark:bg-zinc-900/50 border dark:border-zinc-800 p-2 rounded-md">
                    {voucher.pdf_url}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex items-center gap-1.5 h-9">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Kopyalandı!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        PDF Kopyala
                      </>
                    )}
                  </Button>
                  <Button variant="default" size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 h-9">
                    <a href={voucher.pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      PDF Gör
                    </a>
                  </Button>
                </div>
              </div>

              {jpegUrl && (
                <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                        WhatsApp JPEG Görsel URL
                      </span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground select-all truncate bg-white dark:bg-zinc-900/50 border dark:border-zinc-800 p-2 rounded-md">
                      {jpegUrl}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyJpegLink}>
                        {copiedJpeg ? (
                          <>
                            <Check className="mr-1.5 h-4 w-4 text-green-600" />
                            Kopyalandı!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-4 w-4" />
                            JPEG Kopyala
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={jpegUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          JPEG Olarak Göster
                        </a>
                      </Button>
                    </div>
                  </div>
                  <a href={jpegUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border bg-white">
                    <img src={jpegUrl} alt="Bilet JPEG önizleme" className="h-auto w-full object-contain" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <VoucherActions 
          voucher={voucher} 
          autoSend={isNewVoucher || isRevisedVoucher} 
          isRevised={isRevisedVoucher} 
          onPdfUploaded={(url) => setVoucher(prev => ({ ...prev, pdf_url: url }))}
        />
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
