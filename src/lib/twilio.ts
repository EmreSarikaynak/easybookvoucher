import twilio from "twilio";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const statusCallbackUrl =
    process.env.TWILIO_STATUS_CALLBACK_URL
    || "https://bodrumdayiz.com.tr/api/webhooks/twilio";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * WhatsApp numarasını E.164 formatına çevirir (Twilio için gereklidir).
 * Ülke kodu girilmemişse varsayılan olarak Türkiye (+90) eklenir.
 */
function formatWhatsAppNumber(phone: string): string {
    let digits = phone.replace(/[^0-9]/g, "");

    const rawTrimmed = phone.trim();
    const hasCountryCode =
        rawTrimmed.startsWith("+") ||
        rawTrimmed.startsWith("00") ||
        digits.length > 11;

    if (!hasCountryCode) {
        if (digits.startsWith("0")) {
            digits = "90" + digits.slice(1);
        } else {
            digits = "90" + digits;
        }
    }

    return `whatsapp:+${digits}`;
}

export interface TwilioMessageOptions {
    to: string; // Müşteri telefon numarası
    voucherNo: string;
    tourName: string;
    tourDate: string;
    customerName: string;
}

/**
 * Twilio üzerinden otomatik WhatsApp mesajı gönderir.
 * Not: Sadece test amaçlı sandbox numaranızla kullanılabilir.
 * Gerçek kullanımda WhatsApp onaylı bir Message Template gerektirir.
 */
export async function sendWhatsAppMessage(opts: TwilioMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!client || !twilioNumber) {
        console.error("Twilio credentials are not set in environment variables");
        return { success: false, error: "Twilio yapılandırması eksik" };
    }

    try {
        const to = formatWhatsAppNumber(opts.to);
        
        // WhatsApp Business onaylı şablon gerektirir.
        // Sandbox modunda veya onaylanmış şablon kullandığınızı varsayıyoruz.
        const messageBody = `Merhaba ${opts.customerName},\n\n` +
            `${opts.voucherNo} numaralı ${opts.tourName} biletiniz başarıyla oluşturulmuştur.\n` +
            `Tarih: ${format(new Date(opts.tourDate), "dd MMMM yyyy EEEE", { locale: tr })}\n\n` +
            `Bizi tercih ettiğiniz için teşekkür ederiz.`;

        const message = await client.messages.create({
            body: messageBody,
            from: twilioNumber,
            to: to,
            statusCallback: statusCallbackUrl,
        });

        console.log(`WhatsApp mesajı gönderildi: ${message.sid}`);

        // Veritabanına kaydet (Log)
        try {
            // Sadece bu loglama işlemi için admin yetkili client kullanabiliriz 
            // ya da mevcut kullanıcı session'ı varsa o eklenecek
            const { createServiceRoleClient } = await import("@/lib/supabase-server");
            const supabase = createServiceRoleClient();
            
            await supabase.from("whatsapp_logs").insert({
                message_sid: message.sid,
                voucher_no: opts.voucherNo,
                phone_number: opts.to,
                direction: "outbound",
                body: messageBody,
                status: message.status || "queued",
            });
        } catch (dbError) {
            console.error("WhatsApp logu veritabanına yazılamadı:", dbError);
            // Log hatası asıl akışı (mesajın gönderilmiş olmasını) bozmamalı
        }

        return { success: true, messageId: message.sid };
    } catch (error: any) {
        console.error("WhatsApp mesajı gönderilemedi:", error);
        
        // Başarısız olursa yine logla
        try {
            const { createServiceRoleClient } = await import("@/lib/supabase-server");
            const supabase = createServiceRoleClient();
            
            await supabase.from("whatsapp_logs").insert({
                message_sid: `failed-${Date.now()}`,
                voucher_no: opts.voucherNo,
                phone_number: opts.to,
                direction: "outbound",
                body: "Gönderim Hatası",
                status: "failed",
                error_message: error.message || "Bilinmeyen hata",
            });
        } catch (dbError) {
            console.error("Hatalı WhatsApp logu veritabanına yazılamadı:", dbError);
        }

        return { success: false, error: error.message || "Mesaj gönderme hatası" };
    }
}
