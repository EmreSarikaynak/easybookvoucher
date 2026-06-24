/**
 * Duyuru WhatsApp gönderimi.
 *
 * Mevcut: serbest metin (`sendWhatsAppViaFetch`). 24 saat penceresi dışındaki
 * numaralar Twilio tarafında `63016` ile `undelivered` olur; `whatsapp_logs`
 * tablosundan izlenir. İleride onaylı bir "announcement" Twilio template'i
 * eklendiğinde `sendAnnouncementTemplateViaFetch` burada toggle edilecek.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppViaFetch } from "@/lib/twilio-core";
import { parseWhatsappPhonesSetting } from "@/lib/settings-utils";
import { normalizeStoredPhone } from "@/lib/phone";
import { toWhatsAppFormat } from "@/lib/whatsapp-markdown";

export type AnnouncementTargetRole =
  | "admin"
  | "super_admin"
  | "agency_admin"
  | "sales"
  | null;

/**
 * Hedef role göre WhatsApp alıcı numara listesini toplar.
 * Set ile dedupe edilir; her numara E.164 formatına normalize edilmiştir
 * (`parseWhatsappPhonesSetting` ve doğrudan profiles.phone girişleri).
 *
 * - `null` (herkes) → admin settings + EasyBook + tüm yönetsel rollerin profiles.phone'u
 * - `admin` → admin settings + EasyBook + role IN (admin, super_admin) olan profiles.phone
 * - `agency_admin` → role = agency_admin olan profiles.phone
 * - `sales` → role = sales olan profiles.phone
 */
export async function resolveAnnouncementRecipients(
  supabase: SupabaseClient,
  targetRole: AnnouncementTargetRole
): Promise<string[]> {
  const phones = new Set<string>();

  const includeAdminSettings =
    !targetRole || targetRole === "admin" || targetRole === "super_admin";

  if (includeAdminSettings) {
    const { data: row } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_whatsapp_phone")
      .maybeSingle();
    parseWhatsappPhonesSetting(row?.value).forEach((p) => phones.add(p));

    if (process.env.TWILIO_EASYBOOK_PHONE) {
      phones.add(process.env.TWILIO_EASYBOOK_PHONE);
    }
  }

  let rolesToFetch: string[];
  if (!targetRole) {
    rolesToFetch = ["admin", "super_admin", "agency_admin", "sales"];
  } else if (targetRole === "admin") {
    rolesToFetch = ["admin", "super_admin"];
  } else {
    rolesToFetch = [targetRole];
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("phone")
    .in("role", rolesToFetch)
    .not("phone", "is", null);

  // profiles.phone tarihsel olarak "0532..." veya boşluklu kaydedilebiliyor.
  // Twilio E.164 beklediği için ham eklersek (özellikle sales hedefinde) tüm
  // gönderimler hata kodu ile düşer. normalizeStoredPhone → "+90..." garantisi.
  for (const p of profiles ?? []) {
    const raw = (p as { phone?: string | null }).phone;
    const normalized = normalizeStoredPhone(raw);
    if (normalized) phones.add(normalized);
  }

  return Array.from(phones);
}

/** WhatsApp mesaj gövdesini hazırlar (sade, marka-tutarlı). */
export function buildAnnouncementWhatsAppBody(
  title: string,
  message: string
): string {
  const formattedMessage = toWhatsAppFormat(message.trim());
  return (
    `🔔 *Yeni Duyuru — Easy Book Tours*\n\n` +
    `*${title.trim()}*\n\n` +
    `${formattedMessage}\n\n` +
    `— EasyBook`
  );
}

export interface SendAnnouncementWhatsAppArgs {
  title: string;
  message: string;
  targetRole: AnnouncementTargetRole;
  announcementId: string;
}

export interface SendAnnouncementWhatsAppResult {
  attempted: number;
  sent: number;
  failed: number;
}

/**
 * Duyuruyu hedef role göre çözülen tüm numaralara WhatsApp ile gönderir.
 * Her gönderim `whatsapp_logs` tablosuna yazılır (twilio-core içinde otomatik).
 * Tek bir gönderim başarısız olsa bile diğerleri devam eder.
 */
export async function sendAnnouncementWhatsApp(
  supabase: SupabaseClient,
  args: SendAnnouncementWhatsAppArgs
): Promise<SendAnnouncementWhatsAppResult> {
  const phones = await resolveAnnouncementRecipients(supabase, args.targetRole);
  if (phones.length === 0) {
    return { attempted: 0, sent: 0, failed: 0 };
  }

  const body = buildAnnouncementWhatsAppBody(args.title, args.message);
  const voucherNo = `ANN-${args.announcementId.slice(0, 8)}`;

  let sent = 0;
  let failed = 0;

  await Promise.all(
    phones.map(async (phone) => {
      try {
        const res = await sendWhatsAppViaFetch({
          to: phone,
          body,
          voucherNo,
          includeMedia: false,
        });
        if (res.success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    })
  );

  return { attempted: phones.length, sent, failed };
}
