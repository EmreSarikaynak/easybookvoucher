"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { sendPushNotifications } from "@/lib/push-send";
import {
  sendAnnouncementWhatsApp,
  type AnnouncementTargetRole,
} from "@/lib/announcement-whatsapp";
import { whatsappMarkdownToPlain } from "@/lib/whatsapp-markdown";

export type AnnouncementStatus = "draft" | "published";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  expires_at: string;
  send_push: boolean;
  send_whatsapp: boolean;
  status: AnnouncementStatus;
  last_sent_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AnnouncementInput {
  title: string;
  message: string;
  targetRole: string | null;
  durationMinutes: number;
  sendPush: boolean;
  sendWhatsApp: boolean;
}

export interface AnnouncementMutationResult {
  success: boolean;
  error?: string;
  id?: string;
  pushSent?: number;
  whatsapp?: {
    attempted: number;
    sent: number;
    failed: number;
  };
}

interface InvalidatePathsArgs {
  revalidateSettings?: boolean;
}

function invalidatePaths(_args?: InvalidatePathsArgs) {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/announcements");
}

async function deliverAnnouncement(opts: {
  id: string;
  title: string;
  message: string;
  targetRole: string | null;
  sendPush: boolean;
  sendWhatsApp: boolean;
}): Promise<Pick<AnnouncementMutationResult, "pushSent" | "whatsapp">> {
  const out: Pick<AnnouncementMutationResult, "pushSent" | "whatsapp"> = {};
  if (opts.sendPush) {
    try {
      const result = await sendPushNotifications({
        title: opts.title,
        body: whatsappMarkdownToPlain(opts.message),
        url: "/dashboard",
        tag: "announcement",
        targetRole: opts.targetRole,
      });
      out.pushSent = result.sent;
    } catch {
      // push hatası duyuruyu yutmamalı
    }
  }

  if (opts.sendWhatsApp) {
    try {
      const supabase = createServiceRoleClient();
      out.whatsapp = await sendAnnouncementWhatsApp(supabase, {
        title: opts.title,
        message: opts.message,
        targetRole: opts.targetRole as AnnouncementTargetRole,
        announcementId: opts.id,
      });
    } catch {
      // WA hatası duyuruyu yutmamalı
    }
  }
  return out;
}

function computeExpiresAt(durationMinutes: number): string {
  const duration = Math.max(1, Math.floor(durationMinutes));
  return new Date(Date.now() + duration * 60 * 1000).toISOString();
}

/**
 * Yeni duyuru oluştur. `asDraft=true` ise sadece kaydedilir; push/WA gönderilmez.
 * `asDraft=false` (varsayılan) ise status='published' + push/WA tetiklenir.
 */
export async function createAnnouncement(
  input: AnnouncementInput,
  asDraft = false
): Promise<AnnouncementMutationResult> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) {
    return { success: false, error: "Yetkisiz" };
  }

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) {
    return { success: false, error: "Başlık ve mesaj zorunludur" };
  }

  const expiresAt = computeExpiresAt(input.durationMinutes);
  const status: AnnouncementStatus = asDraft ? "draft" : "published";
  const supabase = createServiceRoleClient();
  const { data: inserted, error } = await supabase
    .from("announcements")
    .insert({
      title,
      message,
      target_role: input.targetRole,
      expires_at: expiresAt,
      send_push: input.sendPush,
      send_whatsapp: input.sendWhatsApp,
      status,
      last_sent_at: status === "published" ? new Date().toISOString() : null,
      created_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { success: false, error: error?.message ?? "Duyuru kaydedilemedi" };
  }

  let delivery: Pick<AnnouncementMutationResult, "pushSent" | "whatsapp"> = {};
  if (!asDraft) {
    delivery = await deliverAnnouncement({
      id: inserted.id as string,
      title,
      message,
      targetRole: input.targetRole,
      sendPush: input.sendPush,
      sendWhatsApp: input.sendWhatsApp,
    });
  }

  invalidatePaths();
  return { success: true, id: inserted.id as string, ...delivery };
}

/**
 * Mevcut duyurunun alanlarını günceller. Push/WA göndermez. Süre, hedef ve
 * gönderim bayrakları da değiştirilebilir; statü olduğu gibi kalır.
 */
export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput
): Promise<AnnouncementMutationResult> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) {
    return { success: false, error: "Yetkisiz" };
  }

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) {
    return { success: false, error: "Başlık ve mesaj zorunludur" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title,
      message,
      target_role: input.targetRole,
      expires_at: computeExpiresAt(input.durationMinutes),
      send_push: input.sendPush,
      send_whatsapp: input.sendWhatsApp,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidatePaths();
  return { success: true, id };
}

/**
 * Duyuruyu yayımlar veya yeniden gönderir.
 * - Taslak ise status='published' yapılır + push/WA tetiklenir.
 * - Zaten yayında ise sadece push/WA yeniden gönderilir (last_sent_at güncellenir).
 */
export async function publishAnnouncement(
  id: string
): Promise<AnnouncementMutationResult> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) {
    return { success: false, error: "Yetkisiz" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, message, target_role, expires_at, send_push, send_whatsapp, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Duyuru bulunamadı" };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return {
      success: false,
      error: "Duyurunun süresi dolmuş. Önce süreyi uzatın.",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("announcements")
    .update({ status: "published", last_sent_at: nowIso })
    .eq("id", id);

  if (upErr) {
    return { success: false, error: upErr.message };
  }

  const delivery = await deliverAnnouncement({
    id,
    title: data.title as string,
    message: data.message as string,
    targetRole: (data.target_role as string | null) ?? null,
    sendPush: data.send_push as boolean,
    sendWhatsApp: data.send_whatsapp as boolean,
  });

  invalidatePaths();
  return { success: true, id, ...delivery };
}

export async function listActiveAnnouncements(
  role?: string | null
): Promise<Announcement[]> {
  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  if (role) {
    query = query.or(`target_role.is.null,target_role.eq.${role}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Announcement[];
}

export async function listAllAnnouncements(): Promise<Announcement[]> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return [];

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as Announcement[];
}

export async function deleteAnnouncement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) {
    return { success: false, error: "Yetkisiz" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidatePaths();
  return { success: true };
}

// Geriye uyumluluk: önceki CreateAnnouncementInput/Result isimleri.
export type CreateAnnouncementInput = AnnouncementInput;
export type CreateAnnouncementResult = AnnouncementMutationResult;
