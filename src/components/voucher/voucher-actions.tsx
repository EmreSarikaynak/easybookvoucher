"use client";

import { useState, useRef, useEffect } from "react";
import { Download, MessageCircle, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoucherTicket } from "./voucher-ticket";
import { downloadPDF, generatePDF } from "@/lib/pdf";
import { sendToCustomer, sendToEasyBook } from "@/lib/whatsapp";
import type { Voucher } from "@/lib/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Language } from "@/lib/translations";
import { createClient } from "@/lib/supabase";

interface VoucherActionsProps {
  voucher: Voucher;
  /** When true, auto-generates PDF and sends WhatsApp notifications on mount */
  autoSend?: boolean;
  isRevised?: boolean;
  onPdfUploaded?: (url: string) => void;
}

export function VoucherActions({ voucher, autoSend, isRevised, onPdfUploaded }: VoucherActionsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewLang, setPreviewLang] = useState<Language>('tr');
  const ticketRef = useRef<HTMLDivElement>(null);

  // Auto-send state
  const [autoSendStatus, setAutoSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [autoSendMessage, setAutoSendMessage] = useState<string>('');
  const autoSentRef = useRef(false);

  /** Bilet önizlemesi DOM'a bağlanana kadar bekler (ref bazen ilk tick'te hazır değil). */
  const waitForTicketElement = async (maxMs = 8000): Promise<HTMLElement | null> => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (ticketRef.current) return ticketRef.current;
      await new Promise((r) => setTimeout(r, 100));
    }
    return ticketRef.current;
  };

  // Auto-send effect: triggers once when autoSend=true and component is mounted
  useEffect(() => {
    if (!autoSend || autoSentRef.current) return;
    autoSentRef.current = true;

    const run = async () => {
      const ticketEl = await waitForTicketElement();
      if (!ticketEl) {
        throw new Error("Bilet önizlemesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
      }
      setAutoSendStatus('sending');
      setAutoSendMessage(
        isRevised
          ? 'PDF güncelleniyor ve WhatsApp bildirimleri gönderiliyor...'
          : 'PDF oluşturuluyor ve WhatsApp bildirimleri gönderiliyor...'
      );

      try {
        // Wait for fonts & images
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 800));

        // PDF oluştur ve doğrudan Supabase Storage'a yükle (base64 server action limitini aşmamak için)
        const pdf = await generatePDF(ticketEl, `ticket-${voucher.voucher_no}`);
        const pdfBlob = pdf.output("blob");
        const fileName = `${voucher.id}.pdf`;
        const supabase = createClient();

        const { error: uploadError } = await supabase.storage
          .from("voucher-pdfs")
          .upload(fileName, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`PDF yüklenemedi: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("voucher-pdfs")
          .getPublicUrl(fileName);

        // PDF URL kaydı + WhatsApp (API route — Cloudflare'de server action 500 vermesin diye)
        const waRes = await fetch("/api/vouchers/send-pdf-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voucherId: voucher.id,
            pdfUrl: publicUrl,
            isRevised: Boolean(isRevised),
          }),
        });

        const sendResult = (await waRes.json()) as {
          success?: boolean;
          error?: string;
          sent?: number;
        };

        if (!waRes.ok || !sendResult.success) {
          throw new Error(
            sendResult.error ||
              `WhatsApp gönderilemedi (HTTP ${waRes.status})`
          );
        }

        if (onPdfUploaded) {
          onPdfUploaded(publicUrl);
        }

        setAutoSendStatus('success');
        setAutoSendMessage(
          isRevised
            ? '✅ PDF başarıyla güncellendi ve Revize WhatsApp bildirimleri gönderildi!'
            : '✅ PDF oluşturuldu ve WhatsApp bildirimleri gönderildi!'
        );
      } catch (err: any) {
        console.error('Auto-send error:', err);
        setAutoSendStatus('error');
        setAutoSendMessage(`❌ Otomatik gönderim başarısız: ${err?.message || 'Bilinmeyen hata'}`);
      } finally {
        // Clear query parameters from URL to avoid re-triggering autoSend on manual refresh
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('new');
          url.searchParams.delete('revised');
          window.history.replaceState({}, '', url.pathname + url.search);
        }
      }
    };

    run();
  }, [autoSend, voucher.id, voucher.voucher_no, isRevised]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  const getPaxString = () => {
    const parts = [];
    if (voucher.pax_adult > 0) parts.push(`${voucher.pax_adult} Yetişkin`);
    if (voucher.pax_child > 0) parts.push(`${voucher.pax_child} Çocuk`);
    if (voucher.pax_infant > 0) parts.push(`${voucher.pax_infant} Bebek`);
    return parts.join(" + ") || "—";
  };

  const getAgencyCode = () =>
    voucher.agency?.agency_code ||
    voucher.sales_person?.agency?.agency_code ||
    null;

  const handleDownloadPDF = async (lang: Language) => {
    if (!ticketRef.current) return;

    const originalLang = previewLang;
    setPreviewLang(lang);
    await new Promise(resolve => setTimeout(resolve, 100));

    setIsGeneratingPDF(true);
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      const agencyCode = getAgencyCode() || 'NOAGENCY';
      const langSuffix = lang === 'en' ? '-en' : '';
      const filename = `ticket-${voucher.voucher_no}-${agencyCode}-${timestamp}${langSuffix}`;
      await downloadPDF(ticketRef.current, filename);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
      alert("PDF oluşturulurken bir hata oluştu!");
    } finally {
      setIsGeneratingPDF(false);
      setPreviewLang(originalLang);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-send status banner */}
      {autoSendStatus !== 'idle' && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
          autoSendStatus === 'sending' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
          autoSendStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {autoSendStatus === 'sending' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
          {autoSendStatus === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {autoSendStatus === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
          <span>{autoSendMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* English PDF Button */}
        <Button
          onClick={() => handleDownloadPDF('en')}
          disabled={isGeneratingPDF}
          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
        >
          {isGeneratingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          <span className="mr-2">🇬🇧</span>
          EN PDF
        </Button>

        {/* Turkish PDF Button */}
        <Button
          onClick={() => handleDownloadPDF('tr')}
          disabled={isGeneratingPDF}
          className="flex-1 sm:flex-none"
        >
          {isGeneratingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          <span className="mr-2">🇹🇷</span>
          TR PDF
        </Button>
      </div>

      {/* Language Selector for Preview */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Önizleme Dili:</span>
        <button
          onClick={() => setPreviewLang('en')}
          className={`px-3 py-1 rounded-md transition-colors ${previewLang === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
          🇬🇧 English
        </button>
        <button
          onClick={() => setPreviewLang('tr')}
          className={`px-3 py-1 rounded-md transition-colors ${previewLang === 'tr'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
          🇹🇷 Türkçe
        </button>
      </div>

      {/* Bilet Önizleme */}
      <div className="overflow-x-auto pb-4 border rounded-lg bg-gray-50 p-4">
        <VoucherTicket ref={ticketRef} voucher={voucher} lang={previewLang} />
      </div>
    </div>
  );
}
