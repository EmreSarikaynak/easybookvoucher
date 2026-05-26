import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  formatWhatsAppNumber,
  isTurkishPhone,
  normalisePhone,
  normalizePhoneDigits,
} from "@/lib/phone";

export { formatWhatsAppNumber, normalisePhone, normalizePhoneDigits };

const statusCallbackUrl =
  process.env.TWILIO_STATUS_CALLBACK_URL ||
  "https://bodrumdayiz.com.tr/api/webhooks/twilio";

export const easybookPhone =
  process.env.TWILIO_EASYBOOK_PHONE || "+905366029397";

const pdfTemplateSidTr = process.env.TWILIO_PDF_TEMPLATE_SID_TR;
const pdfTemplateSidEn = process.env.TWILIO_PDF_TEMPLATE_SID_EN;
const pdfInternalTemplateSid = process.env.TWILIO_PDF_INTERNAL_TEMPLATE_SID;
const pdfMediaTemplateSidTr = process.env.TWILIO_PDF_MEDIA_TEMPLATE_SID_TR;
const pdfMediaTemplateSidEn = process.env.TWILIO_PDF_MEDIA_TEMPLATE_SID_EN;
const pdfMediaInternalTemplateSid =
  process.env.TWILIO_PDF_MEDIA_INTERNAL_TEMPLATE_SID;

function formatTourDate(tourDate: string, locale?: typeof tr): string {
  try {
    const d = new Date(tourDate);
    if (Number.isNaN(d.getTime())) return tourDate;
    return locale
      ? format(d, "dd MMMM yyyy EEEE", { locale })
      : format(d, "dd MMMM yyyy EEEE");
  } catch {
    return tourDate;
  }
}

function formatPickupTimeLabel(pickupTime: unknown): string | null {
  if (pickupTime == null || pickupTime === "") return null;
  const s = String(pickupTime);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export interface VoucherPDFInfo {
  voucherNo: string;
  tourName: string;
  tourDate: string;
  customerName: string;
  customerPhone?: string | null;
  hotel?: string | null;
  pickupTime?: string | null;
  pickupPlace?: string | null;
  paxAdult?: number;
  paxChild?: number;
  paxInfant?: number;
  /**
   * @deprecated Müşteri-bakan yüzeylerde acente adı GÖSTERİLMEZ. Sadece
   * iç loglama veya admin için kullanılabilir. Yeni kodda agencyCode kullan.
   */
  agencyName?: string | null;
  /** Acente kodu (örn. "2026003") — admin bildiriminde gösterilir */
  agencyCode?: string | null;
  /** Acentenin public katalog URL'si — müşteri body'sine "tüm turlarımız" linki olarak eklenir */
  agencyCatalogUrl?: string | null;
}

export interface PdfWhatsAppBodies {
  /** EasyBook + ayarlardaki admin numarası — operasyonel iç bildirim */
  adminBody: string;
  /** Acente telefonu — acente perspektifinden özet */
  agencyBody: string;
  /** Müşteri — TR veya EN, misafir dostu metin */
  customerBody: string;
}

function buildWaMeLink(phone: string | null | undefined): string {
  if (!phone) return "";
  return `https://wa.me/${normalizePhoneDigits(phone)}`;
}

/**
 * PDF bildirimi için üç ayrı mesaj metni üretir:
 * - admin: tüm operasyonel detay + müşteri wa.me linki
 * - agency: acenteye özel özet (iç link yok)
 * - customer: misafire nazik TR/EN metin (acente adı yok)
 * imageUrl varsa mesaj body'e de eklenir — media attachment gitmese bile link görünür.
 */
export function buildPdfWhatsAppBodies(
  pdfUrl: string,
  voucher: VoucherPDFInfo,
  isRevised?: boolean,
  imageUrl?: string | null
): PdfWhatsAppBodies {
  const dateTr = formatTourDate(voucher.tourDate, tr);
  const dateEn = formatTourDate(voucher.tourDate);

  const paxParts: string[] = [];
  if ((voucher.paxAdult ?? 0) > 0) paxParts.push(`${voucher.paxAdult} Yetişkin`);
  if ((voucher.paxChild ?? 0) > 0) paxParts.push(`${voucher.paxChild} Çocuk`);
  if ((voucher.paxInfant ?? 0) > 0) paxParts.push(`${voucher.paxInfant} Bebek`);
  const paxStr = paxParts.join(" + ") || "—";

  const pickupLabel = formatPickupTimeLabel(voucher.pickupTime);
  const waCustomerLink = buildWaMeLink(voucher.customerPhone);
  const agencyCode = voucher.agencyCode?.trim() || "—";

  const adminTitle = isRevised
    ? "🔴 *REVİZE BİLET KAYDI*"
    : "📋 *YENİ BİLET KAYDI*";

  const adminBody =
    `${adminTitle}\n\n` +
    `🎫 Bilet No: ${voucher.voucherNo}\n` +
    `👤 Misafir: ${voucher.customerName}\n` +
    (voucher.customerPhone ? `📱 Telefon: ${voucher.customerPhone}\n` : "") +
    `🚢 Tur: ${voucher.tourName}\n` +
    `📅 Tarih: ${dateTr}\n` +
    (voucher.hotel ? `🏨 Otel: ${voucher.hotel}\n` : "") +
    (voucher.pickupPlace ? `📍 Alış: ${voucher.pickupPlace}\n` : "") +
    (pickupLabel ? `⏰ Saat: ${pickupLabel}\n` : "") +
    `👥 PAX: ${paxStr}\n` +
    `🏢 Acente Kodu: ${agencyCode}\n` +
    (waCustomerLink ? `💬 Müşteri İle Yazış: ${waCustomerLink}\n` : "") +
    (imageUrl ? `\n🖼 *Bilet Görseli (JPEG):*\n${imageUrl}\n` : "") +
    `\n📄 *PDF Bilet:*\n${pdfUrl}\n\n` +
    `Bu otomatik bir bildirimdir.`;

  const agencyTitle = isRevised
    ? "🔴 *REVİZE BİLET — ACENTE BİLDİRİMİ*"
    : "🎫 *YENİ BİLET — ACENTE BİLDİRİMİ*";

  const agencyBody =
    `${agencyTitle}\n\n` +
    `Merhaba,\n` +
    `Acentenize kayıtlı ${isRevised ? "güncellenmiş" : "yeni"} bilet bilgileri:\n\n` +
    `🎫 Bilet No: ${voucher.voucherNo}\n` +
    `👤 Misafir: ${voucher.customerName}\n` +
    (voucher.customerPhone ? `📱 Misafir Tel: ${voucher.customerPhone}\n` : "") +
    `🚢 Tur: ${voucher.tourName}\n` +
    `📅 Tarih: ${dateTr}\n` +
    (voucher.hotel ? `🏨 Otel: ${voucher.hotel}\n` : "") +
    (voucher.pickupPlace ? `📍 Alış: ${voucher.pickupPlace}\n` : "") +
    (pickupLabel ? `⏰ Saat: ${pickupLabel}\n` : "") +
    `👥 PAX: ${paxStr}\n` +
    (imageUrl ? `\n🖼 *Bilet Görseli:*\n${imageUrl}\n` : "") +
    `\n📄 *PDF Bilet:*\n${pdfUrl}\n\n` +
    `İyi çalışmalar.`;

  const isCustomerTr = voucher.customerPhone
    ? isTurkishPhone(voucher.customerPhone)
    : true;

  const catalogUrl = voucher.agencyCatalogUrl?.trim() || null;

  const customerBody = isCustomerTr
    ? (isRevised
        ? `Sayın ${voucher.customerName},\n\nBilet bilgileriniz güncellenmiştir. Güncel biletiniz ekte ve aşağıdadır.\n\n`
        : `Sayın ${voucher.customerName},\n\nEasyBook Tours Bodrum'a hoş geldiniz! Bilet bilgileriniz aşağıdadır. Tur günü lütfen bu belgeyi yanınızda bulundurun.\n\n`) +
      `🎫 Bilet No: ${voucher.voucherNo}\n` +
      `🚢 Tur: ${voucher.tourName}\n` +
      `📅 Tarih: ${dateTr}\n` +
      (voucher.hotel ? `🏨 Otel: ${voucher.hotel}\n` : "") +
      (voucher.pickupPlace ? `📍 Alış Noktası: ${voucher.pickupPlace}\n` : "") +
      (pickupLabel ? `⏰ Alış Saati: ${pickupLabel}\n` : "") +
      `👥 Kişi Sayısı: ${paxStr}\n` +
      (imageUrl ? `\n🖼 *Bilet Görseli:*\n${imageUrl}\n` : "") +
      `\n📄 *Biletiniz (PDF):*\n${pdfUrl}\n` +
      (catalogUrl ? `\n🌍 *Tüm turlarımız:*\n${catalogUrl}\n` : "") +
      `\nSorularınız için bize WhatsApp üzerinden ulaşabilirsiniz.\n` +
      `İyi tatiller dileriz! 🌊`
    : (isRevised
        ? `Dear ${voucher.customerName},\n\nYour ticket has been updated. Please find your revised ticket attached and below.\n\n`
        : `Dear ${voucher.customerName},\n\nWelcome to EasyBook Tours Bodrum! Your ticket details are below. Please keep this document with you on the day of the tour.\n\n`) +
      `🎫 Ticket No: ${voucher.voucherNo}\n` +
      `🚢 Tour: ${voucher.tourName}\n` +
      `📅 Date: ${dateEn}\n` +
      (voucher.hotel ? `🏨 Hotel: ${voucher.hotel}\n` : "") +
      (voucher.pickupPlace ? `📍 Pickup: ${voucher.pickupPlace}\n` : "") +
      (pickupLabel ? `⏰ Pickup Time: ${pickupLabel}\n` : "") +
      `👥 Guests: ${paxStr}\n` +
      (imageUrl ? `\n🖼 *Ticket Image:*\n${imageUrl}\n` : "") +
      `\n📄 *Your Ticket (PDF):*\n${pdfUrl}\n` +
      (catalogUrl ? `\n🌍 *All our tours:*\n${catalogUrl}\n` : "") +
      `\nIf you have any questions, please contact us via WhatsApp.\n` +
      `Have a wonderful holiday! 🌊`;

  return { adminBody, agencyBody, customerBody };
}

export interface FetchSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: number;
}

interface TemplateSendParams {
  to: string;
  contentSid: string;
  variables: Record<string, string>;
  bodyForLog: string;
  voucherNo: string;
}

/** WhatsApp ek dosyası: JPEG tercih (PDF MediaUrl sık undelivered veriyordu). */
function resolveWhatsAppMediaUrl(
  imageUrl?: string | null,
  pdfUrl?: string
): string | undefined {
  if (imageUrl) return imageUrl;
  if (process.env.TWILIO_SEND_PDF_AS_MEDIA === "true" && pdfUrl) return pdfUrl;
  return undefined;
}

/** Media template variable "1" için tam URL döndürür.
 *  Twilio media header'ı tam URL bekler, sadece dosya adı değil. */
function getMediaVariableFromUrl(mediaUrl?: string | null): string | null {
  if (!mediaUrl) return null;
  return mediaUrl; // tam URL (örn. https://…/voucher-pdfs/abc.jpg)
}

/** Cloudflare Workers uyumlu — Twilio REST API (SDK yok). */
export async function sendWhatsAppViaFetch(params: {
  to: string;
  body: string;
  voucherNo: string;
  mediaUrl?: string;
  includeMedia?: boolean;
}): Promise<FetchSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio yapılandırması eksik (env değişkenleri)" };
  }

  const to = formatWhatsAppNumber(params.to);
  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", to);
  form.set("Body", params.body);
  const attachMedia = params.includeMedia !== false && Boolean(params.mediaUrl);
  if (attachMedia && params.mediaUrl) {
    form.set("MediaUrl", params.mediaUrl);
  }
  form.set("StatusCallback", statusCallbackUrl);

  const credentials =
    typeof btoa === "function"
      ? btoa(`${accountSid}:${authToken}`)
      : Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );

    const data = (await res.json()) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };

    if (!res.ok) {
      const errMsg = data.message || `Twilio HTTP ${res.status}`;
      await logWhatsAppFetch({
        messageSid: `failed-${Date.now()}`,
        voucherNo: params.voucherNo,
        phone: params.to,
        body: params.body,
        status: "failed",
        errorMessage: errMsg,
      });
      return { success: false, error: errMsg, code: data.code };
    }

    await logWhatsAppFetch({
      messageSid: data.sid || `unknown-${Date.now()}`,
      voucherNo: params.voucherNo,
      phone: params.to.replace(/^whatsapp:/, ""),
      body: params.body,
      status: data.status || "queued",
    });

    return { success: true, messageId: data.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Mesaj gönderilemedi";
    return { success: false, error: message };
  }
}

async function sendWhatsAppTemplateViaFetch(
  params: TemplateSendParams
): Promise<FetchSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio yapılandırması eksik (env değişkenleri)" };
  }

  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", formatWhatsAppNumber(params.to));
  form.set("ContentSid", params.contentSid);
  form.set("ContentVariables", JSON.stringify(params.variables));
  form.set("StatusCallback", statusCallbackUrl);

  const credentials =
    typeof btoa === "function"
      ? btoa(`${accountSid}:${authToken}`)
      : Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );

    const data = (await res.json()) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };

    if (!res.ok) {
      const errMsg = data.message || `Twilio HTTP ${res.status}`;
      await logWhatsAppFetch({
        messageSid: `failed-${Date.now()}`,
        voucherNo: params.voucherNo,
        phone: params.to,
        body: params.bodyForLog,
        status: "failed",
        errorMessage: errMsg,
      });
      return { success: false, error: errMsg, code: data.code };
    }

    await logWhatsAppFetch({
      messageSid: data.sid || `unknown-${Date.now()}`,
      voucherNo: params.voucherNo,
      phone: params.to,
      body: params.bodyForLog,
      status: data.status || "queued",
    });

    return { success: true, messageId: data.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Mesaj gönderilemedi";
    return { success: false, error: message };
  }
}

async function logWhatsAppFetch(p: {
  messageSid: string;
  voucherNo: string;
  phone: string;
  body: string;
  status: string;
  errorMessage?: string;
}) {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    await supabase.from("whatsapp_logs").insert({
      message_sid: p.messageSid,
      voucher_no: p.voucherNo,
      phone_number: p.phone,
      direction: "outbound",
      body: p.body,
      status: p.status,
      error_message: p.errorMessage ?? null,
    });
  } catch (dbError) {
    console.error("WhatsApp logu yazılamadı:", dbError);
  }
}

export async function sendVoucherPDFNotificationsFetch(opts: {
  pdfUrl: string;
  /** JPEG bilet görseli — WhatsApp ek dosyası olarak gider */
  imageUrl?: string | null;
  agencyPhone?: string | null;
  /** Ayarlardaki ek admin numaraları (bir veya birden çok). */
  adminPhonesFromSettings?: string[] | null;
  voucher: VoucherPDFInfo;
  isRevised?: boolean;
}): Promise<{ success: boolean; error?: string; sent: number }> {
  const { adminBody, agencyBody, customerBody } = buildPdfWhatsAppBodies(
    opts.pdfUrl,
    opts.voucher,
    opts.isRevised,
    opts.imageUrl  // JPEG URL mesaj body'e de eklenir (ek gönderilemese bile link kalır)
  );

  const easybookNorm = normalisePhone(easybookPhone);
  const dateTr = formatTourDate(opts.voucher.tourDate, tr);
  const dateEn = formatTourDate(opts.voucher.tourDate);
  const mediaVariable = getMediaVariableFromUrl(opts.imageUrl ?? opts.pdfUrl);

  const pickupTimeLabel = formatPickupTimeLabel(opts.voucher.pickupTime) ?? "—";
  const buildPaxStringEn = (): string => {
    const parts: string[] = [];
    if ((opts.voucher.paxAdult ?? 0) > 0) parts.push(`${opts.voucher.paxAdult} Adults`);
    if ((opts.voucher.paxChild ?? 0) > 0) parts.push(`${opts.voucher.paxChild} Children`);
    if ((opts.voucher.paxInfant ?? 0) > 0) parts.push(`${opts.voucher.paxInfant} Infants`);
    return parts.join(" + ") || "—";
  };
  const buildPaxStringTr = (): string => {
    const parts: string[] = [];
    if ((opts.voucher.paxAdult ?? 0) > 0) parts.push(`${opts.voucher.paxAdult} Yetişkin`);
    if ((opts.voucher.paxChild ?? 0) > 0) parts.push(`${opts.voucher.paxChild} Çocuk`);
    if ((opts.voucher.paxInfant ?? 0) > 0) parts.push(`${opts.voucher.paxInfant} Bebek`);
    return parts.join(" + ") || "—";
  };

  const phone = opts.voucher.customerPhone || "—";
  const hotel = opts.voucher.hotel || "—";
  const pickup = opts.voucher.pickupPlace || "—";
  const agencyCode = opts.voucher.agencyCode?.trim() || "—";
  const catalog = opts.voucher.agencyCatalogUrl || "—";

  // ── METİN ŞABLONLARI (görsel yokken / media SID tanımsızken) ──────────────
  // Onaylı `easybook_ticket_full_tr/en` ve `easybook_ticket_internal_tr`
  // şablonları 5 değişkenli: {{1}} ad, {{2}} bilet no, {{3}} tur, {{4}} tarih,
  // {{5}} PDF linki. Değişken SAYISI ve SIRASI şablonla birebir aynı olmalı —
  // aksi halde {{5}} yanlış alanı (örn. otel) gösterir.
  const internalTextVars = {
    "1": opts.voucher.customerName,
    "2": opts.voucher.voucherNo,
    "3": opts.voucher.tourName,
    "4": dateTr,
    "5": opts.pdfUrl,
  };
  const customerTextVarsTr = {
    "1": opts.voucher.customerName,
    "2": opts.voucher.voucherNo,
    "3": opts.voucher.tourName,
    "4": dateTr,
    "5": opts.pdfUrl,
  };
  const customerTextVarsEn = {
    "1": opts.voucher.customerName,
    "2": opts.voucher.voucherNo,
    "3": opts.voucher.tourName,
    "4": dateEn,
    "5": opts.pdfUrl,
  };

  // ── MEDIA ŞABLONLARI (görsel + tüm detaylar) ──────────────────────────────
  // scripts/create-whatsapp-templates.mjs ile oluşturulan zengin şablonlarla
  // birebir uyumlu. {{1}} = media header (bilet görseli URL'si).
  //
  // Müşteri media (easybook_customer_media_tr/en):
  //   1 görsel · 2 ad · 3 bilet · 4 tur · 5 tarih · 6 otel · 7 alış ·
  //   8 saat · 9 kişi · 10 PDF · 11 katalog
  const customerMediaVarsTr = {
    "1": mediaVariable || "",
    "2": opts.voucher.customerName,
    "3": opts.voucher.voucherNo,
    "4": opts.voucher.tourName,
    "5": dateTr,
    "6": hotel,
    "7": pickup,
    "8": pickupTimeLabel,
    "9": buildPaxStringTr(),
    "10": opts.pdfUrl,
    "11": catalog,
  };
  const customerMediaVarsEn = {
    "1": mediaVariable || "",
    "2": opts.voucher.customerName,
    "3": opts.voucher.voucherNo,
    "4": opts.voucher.tourName,
    "5": dateEn,
    "6": hotel,
    "7": pickup,
    "8": pickupTimeLabel,
    "9": buildPaxStringEn(),
    "10": opts.pdfUrl,
    "11": catalog,
  };
  // İç/admin media (easybook_internal_media_tr):
  //   1 görsel · 2 bilet · 3 ad · 4 telefon · 5 tur · 6 tarih · 7 otel ·
  //   8 alış · 9 saat · 10 kişi · 11 acente kodu · 12 PDF
  const internalMediaVars = {
    "1": mediaVariable || "",
    "2": opts.voucher.voucherNo,
    "3": opts.voucher.customerName,
    "4": phone,
    "5": opts.voucher.tourName,
    "6": dateTr,
    "7": hotel,
    "8": pickup,
    "9": pickupTimeLabel,
    "10": buildPaxStringTr(),
    "11": agencyCode,
    "12": opts.pdfUrl,
  };
  const internalTemplateSid =
    mediaVariable && pdfMediaInternalTemplateSid
      ? pdfMediaInternalTemplateSid
      : pdfInternalTemplateSid;
  const internalTemplateVars =
    mediaVariable && pdfMediaInternalTemplateSid
      ? internalMediaVars
      : internalTextVars;

  /**
   * forceTemplate=true → freeform denemeden doğrudan onaylı template gönderir.
   * TÜM hedefler için kritik (admin dahil): freeform gönderim Twilio'dan
   * senkron "queued" (HTTP 200) döner ama 24h penceresi dışındaki alıcılarda
   * sonradan async olarak undelivered (kod 63016) olur — o aşamada inline
   * fallback çalışamaz. Admin/EasyBook numarası genelde işletmeye son 24 saatte
   * mesaj atmadığı için pencere dışıdır; bu yüzden admin de baştan onaylı
   * internal template ile gönderilir.
   */
  const targets: Array<{
    to: string;
    body: string;
    templateSid?: string;
    templateVariables?: Record<string, string>;
    forceTemplate?: boolean;
  }> = [
    {
      to: easybookPhone,
      body: adminBody,
      templateSid: internalTemplateSid,
      templateVariables: internalTemplateVars,
      forceTemplate: true,
    },
  ];

  // Ayarlardaki ek admin numaraları — EasyBook ve birbirleriyle tekrarları elenir.
  const seenAdminNorms = new Set<string>([easybookNorm]);
  for (const adminPhone of opts.adminPhonesFromSettings ?? []) {
    if (!adminPhone) continue;
    const adminNorm = normalisePhone(adminPhone);
    if (seenAdminNorms.has(adminNorm)) continue;
    seenAdminNorms.add(adminNorm);
    targets.push({
      to: adminPhone,
      body: adminBody,
      templateSid: internalTemplateSid,
      templateVariables: internalTemplateVars,
      forceTemplate: true,
    });
  }

  if (opts.agencyPhone) {
    targets.push({
      to: opts.agencyPhone,
      body: agencyBody,
      templateSid: internalTemplateSid,
      templateVariables: internalTemplateVars,
      forceTemplate: true,
    });
  }

  if (opts.voucher.customerPhone) {
    const customerIsTr = isTurkishPhone(opts.voucher.customerPhone);
    const customerMediaSid = customerIsTr
      ? pdfMediaTemplateSidTr
      : pdfMediaTemplateSidEn;
    const customerTextSid = customerIsTr ? pdfTemplateSidTr : pdfTemplateSidEn;
    targets.push({
      to: opts.voucher.customerPhone,
      body: customerBody,
      templateSid:
        mediaVariable && customerMediaSid ? customerMediaSid : customerTextSid,
      templateVariables:
        mediaVariable && customerMediaSid
          ? customerIsTr
            ? customerMediaVarsTr
            : customerMediaVarsEn
          : customerIsTr
            ? customerTextVarsTr
            : customerTextVarsEn,
      forceTemplate: true,
    });
  }

  const mediaUrl = resolveWhatsAppMediaUrl(opts.imageUrl, opts.pdfUrl);
  let sent = 0;
  let lastError = "";

  for (const target of targets) {
    const useTemplateFirst = target.forceTemplate && Boolean(target.templateSid);
    let result: FetchSendResult;

    if (useTemplateFirst && target.templateSid) {
      result = await sendWhatsAppTemplateViaFetch({
        to: target.to,
        contentSid: target.templateSid,
        variables: target.templateVariables ?? {},
        bodyForLog: target.body,
        voucherNo: opts.voucher.voucherNo,
      });
      // Template başarısızsa son çare olarak freeform dene (lokal/test ortamı için)
      if (!result.success) {
        result = await sendWhatsAppViaFetch({
          to: target.to,
          body: target.body,
          voucherNo: opts.voucher.voucherNo,
          mediaUrl,
          includeMedia: Boolean(mediaUrl),
        });
      }
    } else {
      result = await sendWhatsAppViaFetch({
        to: target.to,
        body: target.body,
        voucherNo: opts.voucher.voucherNo,
        mediaUrl,
        includeMedia: Boolean(mediaUrl),
      });
      // Medya reddedilirse yalnızca metin + link ile tekrar dene
      if (!result.success && mediaUrl) {
        result = await sendWhatsAppViaFetch({
          to: target.to,
          body: target.body,
          voucherNo: opts.voucher.voucherNo,
          includeMedia: false,
        });
      }
      // 24 saat penceresi dışındaysa onaylı template ile tekrar dene (defansif).
      if (!result.success && result.code === 63016 && target.templateSid) {
        result = await sendWhatsAppTemplateViaFetch({
          to: target.to,
          contentSid: target.templateSid,
          variables: target.templateVariables ?? {},
          bodyForLog: `${target.body}\n\n(Template fallback: ${target.templateSid})`,
          voucherNo: opts.voucher.voucherNo,
        });
      }
    }

    if (result.success) sent++;
    else lastError = result.error || lastError;
  }

  if (sent === 0) {
    return {
      success: false,
      error: lastError || "Hiçbir alıcıya gönderilemedi",
      sent: 0,
    };
  }

  return { success: true, sent, error: lastError || undefined };
}
