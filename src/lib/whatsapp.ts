import { EASYBOOK_CONTACT, WHATSAPP_MESSAGES } from "./constants";

/**
 * WhatsApp numarasını formatlar.
 * Ülke kodu girilmemişse varsayılan olarak Türkiye (+90) eklenir.
 */
function formatPhoneNumber(phone: string): string {
  // Tüm özel karakterleri ve boşlukları kaldır
  let digits = phone.replace(/[^0-9]/g, "");

  // Zaten +/00 ile başladıysa veya rakam sayısı 11'den fazlaysa ülke kodu vardır
  const rawTrimmed = phone.trim();
  const hasCountryCode =
    rawTrimmed.startsWith("+") ||
    rawTrimmed.startsWith("00") ||
    digits.length > 11;

  if (!hasCountryCode) {
    // Türkiye'de numaralar genellikle 0 ile başlar → 05xx veya 5xx
    if (digits.startsWith("0")) {
      digits = "90" + digits.slice(1); // 05... → 905...
    } else {
      digits = "90" + digits; // 5... → 905...
    }
  }

  return digits;
}

/**
 * WhatsApp web linkini oluşturur
 */
function createWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export interface CustomerSendOptions {
  customerPhone: string;
  voucherNo: string;
  tourName: string;
  tourDate: string;
  customerName: string;
  pickupTime?: string | null;
  pickupPlace?: string | null;
  hotel?: string | null;
  pax?: string;
}

export interface EasyBookSendOptions {
  voucherNo: string;
  customerName: string;
  customerPhone?: string | null;
  tourName: string;
  tourDate: string;
  pickupTime?: string | null;
  pickupPlace?: string | null;
  hotel?: string | null;
  pax?: string;
  agencyCode?: string | null;
}

/**
 * Müşteriye WhatsApp ile bilet bilgisi gönderir
 */
export function sendToCustomer(opts: CustomerSendOptions): void {
  if (!opts.customerPhone) {
    alert("Müşteri telefon numarası girilmemiş!");
    return;
  }

  const message = WHATSAPP_MESSAGES.toCustomer(opts);
  const link = createWhatsAppLink(opts.customerPhone, message);

  // Yeni sekmede aç
  window.open(link, "_blank");
}

/**
 * EasyBook'a WhatsApp ile bilet bilgisi gönderir
 */
export function sendToEasyBook(opts: EasyBookSendOptions): void {
  const message = WHATSAPP_MESSAGES.toEasyBook(opts);
  const link = createWhatsAppLink(EASYBOOK_CONTACT.phone, message);

  // Yeni sekmede aç
  window.open(link, "_blank");
}

/**
 * Genel WhatsApp paylaşım fonksiyonu
 */
export function shareViaWhatsApp(phone: string, message: string): void {
  const link = createWhatsAppLink(phone, message);
  window.open(link, "_blank");
}
