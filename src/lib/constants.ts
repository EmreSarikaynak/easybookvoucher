import type { CustomerSendOptions, EasyBookSendOptions } from "./whatsapp";

// EasyBook Tours İletişim Bilgileri
export const EASYBOOK_CONTACT = {
  phone: "+905366029397",
  phoneDisplay: "+(90) 536 602 93 97",
  website: "www.easybooktours.com",
  instagram: "@easybooktours",
  facebook: "facebook/easybooktours",
  location: "BODRUM",
};

/** Sentinel prefix used when customer picks themselves up */
export const SELF_PICKUP = "SELF_PICKUP";

/**
 * Encode self-pickup with optional departure location.
 * Result: "SELF_PICKUP" or "SELF_PICKUP:Bodrum Marina"
 */
export function encodeSelfPickup(location?: string): string {
  const loc = location?.trim();
  return loc ? `${SELF_PICKUP}:${loc}` : SELF_PICKUP;
}

/**
 * Parse a pickup_place value.
 * Returns { isSelf, location } where location is the departure point (if provided).
 */
export function parseSelfPickup(place: string | null | undefined): { isSelf: boolean; location: string | null } {
  if (!place) return { isSelf: false, location: null };
  if (place === SELF_PICKUP) return { isSelf: true, location: null };
  if (place.startsWith(`${SELF_PICKUP}:`)) {
    return { isSelf: true, location: place.slice(SELF_PICKUP.length + 1) || null };
  }
  return { isSelf: false, location: null };
}

const pickupLabel = (place: string | null | undefined): string | null => {
  if (!place) return null;
  const { isSelf, location } = parseSelfPickup(place);
  if (isSelf) return location ? `Kendi Geliyorlar (${location})` : "Kendi Geliyorlar";
  return place;
};

// WhatsApp mesaj sablonlari
export const WHATSAPP_MESSAGES = {
  toCustomer: (opts: CustomerSendOptions) => {
    const { isSelf } = parseSelfPickup(opts.pickupPlace);
    const lines = [
      `Merhaba ${opts.customerName}! 🌴`,
      ``,
      `EasyBook Tours bilet bilgileriniz:`,
      ``,
      `🎫 Bilet No: ${opts.voucherNo}`,
      `🚢 Tur: ${opts.tourName}`,
      `📅 Tarih: ${opts.tourDate}`,
    ];
    const plabel = pickupLabel(opts.pickupPlace);
    if (plabel) lines.push(`📍 ${isSelf ? "Kalkış Noktası" : "Alış Noktası"}: ${plabel}`);
    if (opts.pickupTime) {
      lines.push(`⏰ ${isSelf ? "Hareket Saati" : "Alınış Saati"}: ${opts.pickupTime}`);
    }
    if (opts.hotel) lines.push(`🏨 Otel: ${opts.hotel}`);
    if (opts.pax) lines.push(`👥 Kişi: ${opts.pax}`);
    lines.push(``);
    lines.push(`İyi tatiller dileriz! 🌊`);
    lines.push(`📞 ${EASYBOOK_CONTACT.phoneDisplay}`);
    return lines.join("\n");
  },

  toEasyBook: (opts: EasyBookSendOptions) => {
    const { isSelf } = parseSelfPickup(opts.pickupPlace);
    const lines = [
      `📋 *YENİ BİLET KAYDI*`,
      ``,
      `🎫 Bilet No: ${opts.voucherNo}`,
      `👤 Müşteri: ${opts.customerName}`,
    ];
    if (opts.customerPhone) lines.push(`📱 Telefon: ${opts.customerPhone}`);
    lines.push(`🚢 Tur: ${opts.tourName}`);
    lines.push(`📅 Tarih: ${opts.tourDate}`);
    const plabel = pickupLabel(opts.pickupPlace);
    if (plabel) lines.push(`📍 ${isSelf ? "Kalkış Noktası" : "Alış Noktası"}: ${plabel}`);
    if (opts.pickupTime) {
      lines.push(`⏰ ${isSelf ? "Hareket Saati" : "Alınış Saati"}: ${opts.pickupTime}`);
    }
    if (opts.hotel) lines.push(`🏨 Otel: ${opts.hotel}`);
    if (opts.pax) lines.push(`👥 Kişi: ${opts.pax}`);
    if (opts.agencyCode) lines.push(`🏢 Acente: ${opts.agencyCode}`);
    return lines.join("\n");
  },
};

/**
 * Default Tour URL used as fallback when no tour URL is provided
 * This URL will be used in QR codes when tour_url field is empty
 */
export const DEFAULT_TOUR_URL = "https://www.youtube.com/@bodrumtouragency-easybooktours/videos";
