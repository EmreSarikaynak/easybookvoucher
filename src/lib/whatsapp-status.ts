/**
 * WhatsApp log durum/hata kodlarını anlaşılır Türkçe metne çevirir.
 * UI (whatsapp-logs) bu yardımcıları kullanır.
 */

export type WhatsAppStatusTone = "success" | "progress" | "error" | "neutral";

export interface WhatsAppStatusInfo {
  label: string;
  tone: WhatsAppStatusTone;
}

/** Twilio mesaj durumu → Türkçe etiket + ton. */
export function describeWhatsAppStatus(status: string): WhatsAppStatusInfo {
  switch (status) {
    case "read":
      return { label: "Okundu", tone: "success" };
    case "delivered":
      return { label: "Teslim edildi", tone: "success" };
    case "sent":
      return { label: "Gönderildi", tone: "progress" };
    case "queued":
      return { label: "Sırada", tone: "progress" };
    case "sending":
      return { label: "Gönderiliyor", tone: "progress" };
    case "accepted":
      return { label: "Kabul edildi", tone: "progress" };
    case "failed":
      return { label: "Başarısız", tone: "error" };
    case "undelivered":
      return { label: "İletilemedi", tone: "error" };
    case "received":
      return { label: "Gelen mesaj", tone: "neutral" };
    default:
      return { label: status || "—", tone: "neutral" };
  }
}

/**
 * Bilinen Twilio WhatsApp hata kodları için kullanıcı dostu açıklama.
 * error_message içinde "kod:NNNNN" veya saf kod geçebilir.
 */
export function explainWhatsAppError(
  errorMessage: string | null | undefined
): string | null {
  if (!errorMessage) return null;
  const codeMatch = errorMessage.match(/\b(6\d{4}|2\d{4})\b/);
  const code = codeMatch ? codeMatch[1] : null;

  const explanations: Record<string, string> = {
    "63016":
      "Numara son 24 saatte yazmadığı için serbest mesaj iletilemedi. Onaylı şablonla tekrar deneyin.",
    "63049":
      "WhatsApp bu mesajı (şablon/içerik kısıtı) iletmedi. Şablonun onaylı ve aktif olduğundan emin olun.",
    "63024":
      "Geçersiz şablon veya parametre. Şablon değişkenlerini kontrol edin.",
    "63003":
      "Alıcı WhatsApp kanalında bulunamadı. Numara WhatsApp kullanıcısı değil olabilir.",
    "21211":
      "Telefon numarası geçersiz. Numarayı düzeltip tekrar gönderin.",
    "21408":
      "Bu numaraya/ülkeye gönderim izni yok.",
    "63007":
      "WhatsApp gönderici numarası bulunamadı veya yapılandırma hatalı.",
  };

  if (code && explanations[code]) {
    return explanations[code];
  }
  return null;
}
