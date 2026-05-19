import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusCallbackUrl =
  process.env.TWILIO_STATUS_CALLBACK_URL ||
  "https://bodrumdayiz.com.tr/api/webhooks/twilio";

export const easybookPhone =
  process.env.TWILIO_EASYBOOK_PHONE || "+905366029397";

/** TR ve uluslararası numaraları whatsapp:+XXXXXXXX formatına çevirir. */
export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // +900553... yazım hatası → 90553...
  if (digits.startsWith("900") && digits.length >= 12) {
    digits = "90" + digits.slice(3);
  }
  if (digits.startsWith("0")) digits = "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) digits = "90" + digits;
  return digits;
}

export function formatWhatsAppNumber(phone: string): string {
  return `whatsapp:+${normalizePhoneDigits(phone)}`;
}

export function normalisePhone(phone: string): string {
  return formatWhatsAppNumber(phone).replace("whatsapp:", "");
}

function isTurkishPhone(phone: string): boolean {
  return formatWhatsAppNumber(phone).startsWith("whatsapp:+90");
}

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
  agencyName?: string | null;
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
 */
export function buildPdfWhatsAppBodies(
  pdfUrl: string,
  voucher: VoucherPDFInfo,
  isRevised?: boolean
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
  const agencyName = voucher.agencyName?.trim() || "—";

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
    `🏢 Acente: ${agencyName}\n` +
    (waCustomerLink ? `💬 Müşteri İle Yazış: ${waCustomerLink}\n` : "") +
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
    `\n📄 *PDF Bilet:*\n${pdfUrl}\n\n` +
    `İyi çalışmalar.`;

  const isCustomerTr = voucher.customerPhone
    ? isTurkishPhone(voucher.customerPhone)
    : true;

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
      `\n📄 *Biletiniz (PDF):*\n${pdfUrl}\n\n` +
      `Sorularınız için bize WhatsApp üzerinden ulaşabilirsiniz.\n` +
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
      `\n📄 *Your Ticket (PDF):*\n${pdfUrl}\n\n` +
      `If you have any questions, please contact us via WhatsApp.\n` +
      `Have a wonderful holiday! 🌊`;

  return { adminBody, agencyBody, customerBody };
}

export interface FetchSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * PDF bildirimlerinde MediaUrl çoğu undelivered üretiyor (Meta medya doğrulaması).
 * Link metin içinde yeterli; ek dosya için varsayılan kapalı.
 */
const USE_WHATSAPP_MEDIA_ATTACHMENT =
  process.env.TWILIO_SEND_PDF_AS_MEDIA === "true";

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
  const attachMedia =
    params.includeMedia !== false &&
    USE_WHATSAPP_MEDIA_ATTACHMENT &&
    Boolean(params.mediaUrl);
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
      return { success: false, error: errMsg };
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
  agencyPhone?: string | null;
  adminPhoneFromSettings?: string | null;
  voucher: VoucherPDFInfo;
  isRevised?: boolean;
}): Promise<{ success: boolean; error?: string; sent: number }> {
  const { adminBody, agencyBody, customerBody } = buildPdfWhatsAppBodies(
    opts.pdfUrl,
    opts.voucher,
    opts.isRevised
  );

  const easybookNorm = normalisePhone(easybookPhone);
  const targets: { to: string; body: string }[] = [
    { to: easybookPhone, body: adminBody },
  ];

  if (opts.adminPhoneFromSettings) {
    const adminNorm = normalisePhone(opts.adminPhoneFromSettings);
    if (adminNorm !== easybookNorm) {
      targets.push({ to: opts.adminPhoneFromSettings, body: adminBody });
    }
  }

  if (opts.agencyPhone) {
    targets.push({ to: opts.agencyPhone, body: agencyBody });
  }

  if (opts.voucher.customerPhone) {
    targets.push({ to: opts.voucher.customerPhone, body: customerBody });
  }

  let sent = 0;
  let lastError = "";

  for (const target of targets) {
    const result = await sendWhatsAppViaFetch({
      to: target.to,
      body: target.body,
      voucherNo: opts.voucher.voucherNo,
      mediaUrl: opts.pdfUrl,
      includeMedia: false,
    });
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
