import twilio from "twilio";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const statusCallbackUrl =
    process.env.TWILIO_STATUS_CALLBACK_URL
    || "https://bodrumdayiz.com.tr/api/webhooks/twilio";

// Template SIDs (set in Cloudflare env once the WhatsApp templates are approved):
//   TR customer template — {{1}} customer, {{2}} voucher, {{3}} tour, {{4}} date
//   EN customer template — same four variables, English copy
//   Internal TR template — {{1}}..{{4}} + {{5}} = agency name
// TWILIO_VOUCHER_TEMPLATE_SID (no suffix) is the legacy single-SID env and is
// kept as a fallback for the Turkish customer template.
const voucherTemplateSidTr =
    process.env.TWILIO_VOUCHER_TEMPLATE_SID_TR
    || process.env.TWILIO_VOUCHER_TEMPLATE_SID;
const voucherTemplateSidEn = process.env.TWILIO_VOUCHER_TEMPLATE_SID_EN;
const internalTemplateSid = process.env.TWILIO_INTERNAL_TEMPLATE_SID;

// EasyBook's own WhatsApp number — receives an internal copy of every
// voucher notification. Overridable via env if it ever changes.
const easybookPhone =
    process.env.TWILIO_EASYBOOK_PHONE || "+905366029397";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Normalises any phone to E.164 (`whatsapp:+<digits>`). Falls back to +90 when
 * no country code is present (Turkish numbers entered as 05.. or 5..).
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

/**
 * Returns true if the (raw) phone resolves to a +90 number once normalised.
 * Used to pick the Turkish vs English customer template.
 */
function isTurkishPhone(phone: string): boolean {
    return formatWhatsAppNumber(phone).startsWith("whatsapp:+90");
}

/* ──────────────────────────────────────────────────────────────────────────
 * Low-level send + log helpers
 * ────────────────────────────────────────────────────────────────────────── */

interface SendOneParams {
    to: string;
    templateSid?: string;
    /** Positional template variables ("1" -> {{1}}, etc.) */
    variables?: Record<string, string>;
    /** Free-form body used both as a fallback when no template SID is set and
     *  as the human-readable text stored in whatsapp_logs. */
    fallbackBody: string;
    voucherNo: string;
}

interface SendOneResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

async function logWhatsApp(p: {
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
        console.error("WhatsApp logu veritabanına yazılamadı:", dbError);
    }
}

async function sendOne(params: SendOneParams): Promise<SendOneResult> {
    if (!client || !twilioNumber) {
        console.error("Twilio credentials are not set in environment variables");
        return { success: false, error: "Twilio yapılandırması eksik" };
    }

    const to = formatWhatsAppNumber(params.to);
    const baseParams: Record<string, unknown> = {
        from: twilioNumber,
        to,
        statusCallback: statusCallbackUrl,
    };

    if (params.templateSid) {
        baseParams.contentSid = params.templateSid;
        baseParams.contentVariables = JSON.stringify(params.variables ?? {});
    } else {
        baseParams.body = params.fallbackBody;
    }

    try {
        const message = await client.messages.create(
            baseParams as unknown as Parameters<typeof client.messages.create>[0]
        );

        await logWhatsApp({
            messageSid: message.sid,
            voucherNo: params.voucherNo,
            phone: params.to,
            body: params.fallbackBody,
            status: message.status || "queued",
        });

        return { success: true, messageId: message.sid };
    } catch (error: any) {
        console.error("WhatsApp gönderim hatası:", error);
        await logWhatsApp({
            messageSid: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            voucherNo: params.voucherNo,
            phone: params.to,
            body: params.fallbackBody,
            status: "failed",
            errorMessage: error?.message || "Bilinmeyen hata",
        });
        return { success: false, error: error?.message || "Mesaj gönderme hatası" };
    }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────────────────────────────────── */

export interface VoucherInfo {
    voucherNo: string;
    tourName: string;
    tourDate: string;
    customerName: string;
    /** Used in the internal template ({{5}}). Defaults to "—" when missing. */
    agencyName?: string | null;
}

export interface VoucherNotificationOptions {
    customerPhone?: string | null;
    agencyPhone?: string | null;
    salesPersonPhone?: string | null;
    voucher: VoucherInfo;
}

export type NotificationRecipient =
    | "customer"
    | "easybook"
    | "agency"
    | "sales";

export interface NotificationResult {
    recipient: NotificationRecipient;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * High-level orchestrator: sends voucher notifications to every applicable
 * recipient (customer, EasyBook internal, agency, sales person). All four
 * are independent — one failing does not affect the others. Each call also
 * appends a row to whatsapp_logs so the UI's resend flow can target them.
 */
export async function sendVoucherNotifications(
    opts: VoucherNotificationOptions
): Promise<{ results: NotificationResult[] }> {
    const v = opts.voucher;
    const dateTr = format(new Date(v.tourDate), "dd MMMM yyyy EEEE", { locale: tr });
    const dateEn = format(new Date(v.tourDate), "dd MMMM yyyy EEEE");
    const agencyName = v.agencyName?.trim() || "—";

    const results: NotificationResult[] = [];

    // 1) Customer — language picked from the phone prefix
    if (opts.customerPhone) {
        const isTr = isTurkishPhone(opts.customerPhone);
        const sid = isTr ? voucherTemplateSidTr : voucherTemplateSidEn;
        const date = isTr ? dateTr : dateEn;

        const fallback = isTr
            ? `Sayın ${v.customerName},\n\nBilet bilgileriniz:\n\nBilet No: ${v.voucherNo}\nTur: ${v.tourName}\nTarih: ${date}\n\nBu otomatik bir bildirimdir. Sorularınız için bize ulaşabilirsiniz.`
            : `Dear ${v.customerName},\n\nYour ticket details:\n\nTicket No: ${v.voucherNo}\nTour: ${v.tourName}\nDate: ${date}\n\nThis is an automated notification. Please contact us if you have any questions.`;

        const r = await sendOne({
            to: opts.customerPhone,
            templateSid: sid,
            variables: {
                "1": v.customerName,
                "2": v.voucherNo,
                "3": v.tourName,
                "4": date,
            },
            fallbackBody: fallback,
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "customer", phone: opts.customerPhone, ...r });
    }

    // 2) EasyBook internal copy
    if (easybookPhone) {
        const fallback =
            `Yeni bilet kesildi.\n\n` +
            `Müşteri: ${v.customerName}\n` +
            `Bilet No: ${v.voucherNo}\n` +
            `Tur: ${v.tourName}\n` +
            `Tarih: ${dateTr}\n` +
            `Acente: ${agencyName}\n\n` +
            `Bu otomatik bir bildirimdir.`;

        const r = await sendOne({
            to: easybookPhone,
            templateSid: internalTemplateSid,
            variables: {
                "1": v.customerName,
                "2": v.voucherNo,
                "3": v.tourName,
                "4": dateTr,
                "5": agencyName,
            },
            fallbackBody: fallback,
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "easybook", phone: easybookPhone, ...r });
    }

    // 3) Agency owner
    if (opts.agencyPhone) {
        const fallback =
            `Yeni bilet kesildi.\n\n` +
            `Müşteri: ${v.customerName}\n` +
            `Bilet No: ${v.voucherNo}\n` +
            `Tur: ${v.tourName}\n` +
            `Tarih: ${dateTr}\n` +
            `Acente: ${agencyName}\n\n` +
            `Bu otomatik bir bildirimdir.`;

        const r = await sendOne({
            to: opts.agencyPhone,
            templateSid: internalTemplateSid,
            variables: {
                "1": v.customerName,
                "2": v.voucherNo,
                "3": v.tourName,
                "4": dateTr,
                "5": agencyName,
            },
            fallbackBody: fallback,
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "agency", phone: opts.agencyPhone, ...r });
    }

    // 4) Sales person who created the voucher
    if (opts.salesPersonPhone) {
        const fallback =
            `Yeni bilet kesildi.\n\n` +
            `Müşteri: ${v.customerName}\n` +
            `Bilet No: ${v.voucherNo}\n` +
            `Tur: ${v.tourName}\n` +
            `Tarih: ${dateTr}\n` +
            `Acente: ${agencyName}\n\n` +
            `Bu otomatik bir bildirimdir.`;

        const r = await sendOne({
            to: opts.salesPersonPhone,
            templateSid: internalTemplateSid,
            variables: {
                "1": v.customerName,
                "2": v.voucherNo,
                "3": v.tourName,
                "4": dateTr,
                "5": agencyName,
            },
            fallbackBody: fallback,
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "sales", phone: opts.salesPersonPhone, ...r });
    }

    return { results };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Backward-compatible single-customer API
 * ────────────────────────────────────────────────────────────────────────── */

export interface TwilioMessageOptions {
    to: string;
    voucherNo: string;
    tourName: string;
    tourDate: string;
    customerName: string;
}

/**
 * @deprecated prefer sendVoucherNotifications which fans out to all recipients.
 * Kept so older call sites keep working until they are migrated.
 */
export async function sendWhatsAppMessage(
    opts: TwilioMessageOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { results } = await sendVoucherNotifications({
        customerPhone: opts.to,
        voucher: {
            voucherNo: opts.voucherNo,
            tourName: opts.tourName,
            tourDate: opts.tourDate,
            customerName: opts.customerName,
        },
    });
    const customerResult = results.find((r) => r.recipient === "customer");
    if (!customerResult) {
        return { success: false, error: "Müşteri telefonu yok" };
    }
    return {
        success: customerResult.success,
        messageId: customerResult.messageId,
        error: customerResult.error,
    };
}
