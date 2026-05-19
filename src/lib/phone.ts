/**
 * Telefon normalizasyonu — kayıt, WhatsApp ve Twilio için tek kaynak.
 * Örnek düzeltmeler: 0553... → +90553..., +900553... → +90553...
 */

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  // +900553... (çift 90) → 90553...
  if (digits.startsWith("900") && digits.length >= 12) {
    digits = "90" + digits.slice(3);
  }
  if (digits.startsWith("0")) digits = "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) digits = "90" + digits;
  return digits;
}

/** Veritabanına kayıt: +905551234567 formatı */
export function normalizeStoredPhone(
  phone: string | null | undefined
): string | null {
  if (phone == null) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 10) return null;
  return `+${digits}`;
}

export function formatWhatsAppNumber(phone: string): string {
  return `whatsapp:+${normalizePhoneDigits(phone)}`;
}

export function normalisePhone(phone: string): string {
  return formatWhatsAppNumber(phone).replace("whatsapp:", "");
}

export function isTurkishPhone(phone: string): boolean {
  return normalizePhoneDigits(phone).startsWith("90");
}
