"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { sendPushNotifications } from "@/lib/push-send";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  expires_at: string;
  send_push: boolean;
  created_at: string;
  created_by: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  targetRole: string | null;
  durationMinutes: number;
  sendPush: boolean;
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<{ success: boolean; error?: string; pushSent?: number }> {
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
  const { error } = await supabase.from("announcements").insert({
    title,
    message,
    target_role: input.targetRole,
    expires_at: expiresAt,
    send_push: input.sendPush,
    created_by: profile?.id ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
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

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { success: true, pushSent };
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
  return { success: true };
}
