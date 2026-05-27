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

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  expires_at: string;
  send_push: boolean;
  send_whatsapp: boolean;
  created_at: string;
  created_by: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  targetRole: string | null;
  durationMinutes: number;
  sendPush: boolean;
  sendWhatsApp: boolean;
}

export interface CreateAnnouncementResult {
  success: boolean;
  error?: string;
  pushSent?: number;
  whatsapp?: {
    attempted: number;
    sent: number;
    failed: number;
  };
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<CreateAnnouncementResult> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) {
    return { success: false, error: "Yetkisiz" };
  }

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) {
    return { success: false, error: "Başlık ve mesaj zorunludur" };
  }

  const duration = Math.max(1, Math.floor(input.durationMinutes));
  const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();

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
      created_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { success: false, error: error?.message ?? "Duyuru kaydedilemedi" };
  }

  let pushSent = 0;
  if (input.sendPush) {
    try {
      const result = await sendPushNotifications({
        title,
        body: message,
        url: "/dashboard",
        tag: "announcement",
        targetRole: input.targetRole,
      });
      pushSent = result.sent;
    } catch {
      // Push gönderimi başarısız olsa bile duyuru kaydı sağlandı
    }
  }

  let whatsapp: CreateAnnouncementResult["whatsapp"];
  if (input.sendWhatsApp) {
    try {
      whatsapp = await sendAnnouncementWhatsApp(supabase, {
        title,
        message,
        targetRole: input.targetRole as AnnouncementTargetRole,
        announcementId: inserted.id as string,
      });
    } catch {
      // WhatsApp gönderimi başarısız olsa bile duyuru kaydı sağlandı
    }
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/announcements");

  return { success: true, pushSent, whatsapp };
}

export async function listActiveAnnouncements(
  role?: string | null
): Promise<Announcement[]> {
  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("announcements")
    .select("*")
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

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/announcements");
  return { success: true };
}
