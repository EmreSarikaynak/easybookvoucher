import twilio from "twilio";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const statusCallbackUrl =
    process.env.TWILIO_STATUS_CALLBACK_URL
    || "https://bodrumdayiz.com.tr/api/webhooks/twilio";
// Once you have an approved WhatsApp template, set this env to its
// Content SID (HX…). When set, voucher messages are sent via the
// template; otherwise we fall back to free-form text (kept for dev /
// for sandbox-opted-in numbers only).
const voucherTemplateSid = process.env.TWILIO_VOUCHER_TEMPLATE_SID;

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
        const formattedDate = format(new Date(opts.tourDate), "dd MMMM yyyy EEEE", { locale: tr });

        // Plain-text body kept around so we can also log a human-readable
        // version of the message in whatsapp_logs (independent of template).
        const messageBody = `Merhaba ${opts.customerName},\n\n` +
            `${opts.voucherNo} numaralı ${opts.tourName} biletiniz başarıyla oluşturulmuştur.\n` +
            `Tarih: ${formattedDate}\n\n` +
            `Bizi tercih ettiğiniz için teşekkür ederiz.`;

        const baseParams: Record<string, unknown> = {
            from: twilioNumber,
            to: to,
            statusCallback: statusCallbackUrl,
        };

        // If a WhatsApp-approved template SID is configured, send via the
        // template (this is required for business-initiated WhatsApp messages
        // outside the 24h customer-service window). Variables are positional:
        //   {{1}} = customer name
        //   {{2}} = voucher number
        //   {{3}} = tour name
        //   {{4}} = tour date (formatted, Turkish locale)
        // The template body in Twilio MUST use these four placeholders in
        // this order, or the variables won't line up.
        if (voucherTemplateSid) {
            baseParams.contentSid = voucherTemplateSid;
            baseParams.contentVariables = JSON.stringify({
                "1": opts.customerName,
                "2": opts.voucherNo,
                "3": opts.tourName,
                "4": formattedDate,
            });
        } else {
            baseParams.body = messageBody;
        }

        const message = await client.messages.create(
            baseParams as unknown as Parameters<typeof client.messages.create>[0]
        );

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
