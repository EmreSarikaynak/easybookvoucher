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
import { uploadVoucherPDF } from "@/app/actions/upload-voucher-pdf";
import { sendVoucherPDFWhatsApp } from "@/app/actions/voucher";

interface VoucherActionsProps {
  voucher: Voucher;
  /** When true, auto-generates PDF and sends WhatsApp notifications on mount */
  autoSend?: boolean;
}

export function VoucherActions({ voucher, autoSend }: VoucherActionsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingCustomer, setIsSendingCustomer] = useState(false);
  const [isSendingEasyBook, setIsSendingEasyBook] = useState(false);
  const [previewLang, setPreviewLang] = useState<Language>('tr');
  const ticketRef = useRef<HTMLDivElement>(null);

  // Auto-send state
  const [autoSendStatus, setAutoSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [autoSendMessage, setAutoSendMessage] = useState<string>('');
  const autoSentRef = useRef(false);

  // Auto-send effect: triggers once when autoSend=true and component is mounted
  useEffect(() => {
    if (!autoSend || autoSentRef.current) return;
    autoSentRef.current = true;

    const run = async () => {
      if (!ticketRef.current) return;
      setAutoSendStatus('sending');
      setAutoSendMessage('PDF oluşturuluyor ve WhatsApp bildirimleri gönderiliyor...');

      try {
        // Wait for fonts & images
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 800));

        // Generate PDF as base64
        const pdf = await generatePDF(ticketRef.current!, `ticket-${voucher.voucher_no}`);
        const pdfBase64 = pdf.output('datauristring');

        // Upload to Supabase Storage
        const uploadResult = await uploadVoucherPDF(voucher.id, pdfBase64);
        if ('error' in uploadResult) {
          throw new Error(uploadResult.error);
        }

        // Send WhatsApp notifications
        const sendResult = await sendVoucherPDFWhatsApp(voucher.id, uploadResult.url);
        if (!sendResult.success) {
          throw new Error(sendResult.error || 'WhatsApp gönderilemedi');
        }

        setAutoSendStatus('success');
        setAutoSendMessage('✅ PDF oluşturuldu ve WhatsApp bildirimleri gönderildi!');
      } catch (err: any) {
        console.error('Auto-send error:', err);
        setAutoSendStatus('error');
        setAutoSendMessage(`❌ Otomatik gönderim başarısız: ${err?.message || 'Bilinmeyen hata'}`);
      }
    };

    run();
  }, [autoSend, voucher.id, voucher.voucher_no]);

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

  /** PDF indir, ardından WhatsApp aç */
  const generateAndSendPDF = async (
    lang: Language,
    filenameBase: string
  ) => {
    if (!ticketRef.current) return;
    const originalLang = previewLang;
    setPreviewLang(lang);
    await new Promise(resolve => setTimeout(resolve, 150));
    await downloadPDF(ticketRef.current, filenameBase);
    setPreviewLang(originalLang);
  };

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

  const handleSendToCustomer = async () => {
    if (!voucher.customer_phone) {
      alert("Müşteri telefon numarası girilmemiş!");
      return;
    }
    setIsSendingCustomer(true);
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      const agencyCode = getAgencyCode() || 'NOAGENCY';
      const filename = `ticket-${voucher.voucher_no}-${agencyCode}-${timestamp}-musteri`;
      await generateAndSendPDF('tr', filename);
      sendToCustomer({
        customerPhone: voucher.customer_phone,
        voucherNo: voucher.voucher_no,
        tourName: voucher.tour?.name || "Tur",
        tourDate: formatDate(voucher.tour_date),
        customerName: voucher.customer_name,
        pickupTime: voucher.pickup_time,
        pickupPlace: voucher.pickup_place,
        hotel: voucher.hotel,
        pax: getPaxString(),
      });
    } catch (err) {
      console.error("Müşteriye gönderilirken hata:", err);
      alert("Gönderim sırasında bir hata oluştu!");
    } finally {
      setIsSendingCustomer(false);
    }
  };

  const handleSendToEasyBook = async () => {
    setIsSendingEasyBook(true);
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      const agencyCode = getAgencyCode() || 'NOAGENCY';
      const filename = `ticket-${voucher.voucher_no}-${agencyCode}-${timestamp}-easybook`;
      await generateAndSendPDF('tr', filename);
      sendToEasyBook({
        voucherNo: voucher.voucher_no,
        customerName: voucher.customer_name,
        customerPhone: voucher.customer_phone,
        tourName: voucher.tour?.name || "Tur",
        tourDate: formatDate(voucher.tour_date),
        pickupTime: voucher.pickup_time,
        pickupPlace: voucher.pickup_place,
        hotel: voucher.hotel,
        pax: getPaxString(),
        agencyCode: getAgencyCode(),
      });
    } catch (err) {
      console.error("EasyBook'a gönderilirken hata:", err);
      alert("Gönderim sırasında bir hata oluştu!");
    } finally {
      setIsSendingEasyBook(false);
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

        <Button
          variant="outline"
          onClick={handleSendToCustomer}
          disabled={isSendingCustomer}
          className="flex-1 sm:flex-none bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
        >
          {isSendingCustomer ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="mr-2 h-4 w-4" />
          )}
          Müşteriye Gönder
        </Button>

        <Button
          variant="outline"
          onClick={handleSendToEasyBook}
          disabled={isSendingEasyBook}
          className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
        >
          {isSendingEasyBook ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          EasyBook&apos;a Gönder
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
