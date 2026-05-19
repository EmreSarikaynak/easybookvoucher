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

function formatWhatsAppNumber(phone: string): string {
    // 1. Strip all non-numeric characters
    let digits = phone.replace(/[^0-9]/g, "");

    // 2. If it starts with '00', strip '00'
    if (digits.startsWith("00")) {
        digits = digits.slice(2);
    }

    // 3. If it starts with '0', strip '0' and prepend '90' (standard Turkish format 05xx -> 905xx)
    if (digits.startsWith("0")) {
        digits = "90" + digits.slice(1);
    }

    // 4. If it's a 10-digit number starting with '5', prepend '90' (5xx -> 905xx)
    if (digits.length === 10 && digits.startsWith("5")) {
        digits = "90" + digits;
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

function normalisePhone(phone: string): string {
    return formatWhatsAppNumber(phone).replace("whatsapp:", "");
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
    mediaUrl?: string;
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

    if (params.mediaUrl) {
        baseParams.mediaUrl = [params.mediaUrl];
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
    adminPhoneFromSettings?: string | null;
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
    const dateTr = formatTourDate(v.tourDate, tr);
    const dateEn = formatTourDate(v.tourDate);
    const agencyName = v.agencyName?.trim() || "—";

    const results: NotificationResult[] = [];

    const getInternalFallback = () => {
        let waLink = "";
        if (opts.customerPhone) {
            let digits = opts.customerPhone.replace(/[^0-9]/g, "");
            const rawTrimmed = opts.customerPhone.trim();
            if (!rawTrimmed.startsWith("+") && !rawTrimmed.startsWith("00") && digits.length <= 11) {
                digits = digits.startsWith("0") ? "90" + digits.slice(1) : "90" + digits;
            }
            waLink = `\n💬 Müşteri İle Yazış: https://wa.me/${digits}`;
        }

        return `📋 *YENİ BİLET KAYDI*\n\n` +
               `🎫 Bilet No: ${v.voucherNo}\n` +
               `👤 Müşteri: ${v.customerName}\n` +
               (opts.customerPhone ? `📱 Telefon: ${opts.customerPhone}\n` : "") +
               `🚢 Tur: ${v.tourName}\n` +
               `📅 Tarih: ${dateTr}\n` +
               `🏢 Acente: ${agencyName}` +
               waLink +
               `\n\nBu otomatik bir bildirimdir.`;
    };

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

    const activeInternalTemplate = internalTemplateSid || voucherTemplateSidTr;
    const internalVariables: Record<string, string> = activeInternalTemplate === internalTemplateSid
        ? {
            "1": v.customerName,
            "2": v.voucherNo,
            "3": v.tourName,
            "4": dateTr,
            "5": agencyName,
          }
        : {
            "1": v.customerName,
            "2": v.voucherNo,
            "3": v.tourName,
            "4": dateTr,
          };

    // 2) EasyBook internal copy
    if (easybookPhone) {
        const r = await sendOne({
            to: easybookPhone,
            templateSid: activeInternalTemplate,
            variables: internalVariables,
            fallbackBody: getInternalFallback(),
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "easybook", phone: easybookPhone, ...r });
    }

    // 2.5) Admin number from settings — only if different from EasyBook
    if (opts.adminPhoneFromSettings) {
        const adminNorm = normalisePhone(opts.adminPhoneFromSettings);
        const easybookNorm = normalisePhone(easybookPhone);
        if (adminNorm !== easybookNorm) {
            const r = await sendOne({
                to: opts.adminPhoneFromSettings,
                templateSid: activeInternalTemplate,
                variables: internalVariables,
                fallbackBody: getInternalFallback(),
                voucherNo: v.voucherNo,
            });
            results.push({ recipient: "easybook", phone: opts.adminPhoneFromSettings, ...r });
        }
    }

    // 3) Agency owner
    if (opts.agencyPhone) {
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
            fallbackBody: getInternalFallback(),
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "agency", phone: opts.agencyPhone, ...r });
    }

    // 4) Sales person who created the voucher
    if (opts.salesPersonPhone) {
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
            fallbackBody: getInternalFallback(),
            voucherNo: v.voucherNo,
        });
        results.push({ recipient: "sales", phone: opts.salesPersonPhone, ...r });
    }

    return { results };
}

/* ──────────────────────────────────────────────────────────────────────────
 * PDF URL notification (admin + agency)
 * ────────────────────────────────────────────────────────────────────────── */

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

export interface VoucherPDFNotificationOptions {
    pdfUrl: string;
    agencyPhone?: string | null;
    /** Admin number from the settings table. If same as easybookPhone, deduped. */
    adminPhoneFromSettings?: string | null;
    voucher: VoucherPDFInfo;
    isRevised?: boolean;
}

/**
 * Sends a rich text message + PDF link to:
 *  1. Hardcoded EasyBook number (+905366029397) — always
 *  2. Admin number from settings — only if different from EasyBook number
 *  3. Agency phone — only if present
 *
 * No Twilio media URL needed; the PDF public URL is embedded in the message.
 */
export async function sendVoucherPDFNotifications(
    opts: VoucherPDFNotificationOptions
): Promise<{ results: NotificationResult[] }> {
    const v = opts.voucher;
    const results: NotificationResult[] = [];

    const { buildPdfWhatsAppBodies } = await import("@/lib/twilio-core");
    const { adminBody, agencyBody, customerBody } = buildPdfWhatsAppBodies(
        opts.pdfUrl,
        v,
        opts.isRevised
    );

    const easybookNorm = normalisePhone(easybookPhone);

    // 1. EasyBook dahili
    const r1 = await sendOne({
        to: easybookPhone,
        fallbackBody: adminBody,
        voucherNo: v.voucherNo,
        mediaUrl: opts.pdfUrl,
    });
    results.push({ recipient: "easybook", phone: easybookPhone, ...r1 });

    // 2. Ayarlardaki admin (EasyBook'tan farklıysa)
    if (opts.adminPhoneFromSettings) {
        const adminNorm = normalisePhone(opts.adminPhoneFromSettings);
        if (adminNorm !== easybookNorm) {
            const r2 = await sendOne({
                to: opts.adminPhoneFromSettings,
                fallbackBody: adminBody,
                voucherNo: v.voucherNo,
                mediaUrl: opts.pdfUrl,
            });
            results.push({ recipient: "easybook", phone: opts.adminPhoneFromSettings, ...r2 });
        }
    }

    // 3. Acente — acenteye özel metin
    if (opts.agencyPhone) {
        const r3 = await sendOne({
            to: opts.agencyPhone,
            fallbackBody: agencyBody,
            voucherNo: v.voucherNo,
            mediaUrl: opts.pdfUrl,
        });
        results.push({ recipient: "agency", phone: opts.agencyPhone, ...r3 });
    }

    // 4. Müşteri — TR/EN misafir metni
    if (v.customerPhone) {
        const r4 = await sendOne({
            to: v.customerPhone,
            fallbackBody: customerBody,
            voucherNo: v.voucherNo,
            mediaUrl: opts.pdfUrl,
        });
        results.push({ recipient: "customer", phone: v.customerPhone, ...r4 });
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
