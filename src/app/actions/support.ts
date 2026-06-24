"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/types";

async function getAuthUserAndProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, agency_id, full_name")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

/**
 * Yeni destek talebi oluştur (acente/kullanıcı).
 */
export async function createSupportTicket(
  subject: string,
  message: string,
  priority: SupportTicketPriority = "normal"
): Promise<{ data?: SupportTicket; error?: string }> {
  const { supabase, user, profile } = await getAuthUserAndProfile();
  if (!user || !profile) return { error: "Oturum açmanız gerekiyor" };

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      agency_id: profile.agency_id ?? null,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      status: "open",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/support");
  return { data };
}

/**
 * Destek taleplerini listele.
 * - Admin: tüm talepler (kullanıcı+acente bilgisi join)
 * - Diğer: sadece kendi talepleri
 */
export async function getSupportTickets(): Promise<{
  data?: SupportTicket[];
  error?: string;
}> {
  const { supabase, user, profile } = await getAuthUserAndProfile();
  if (!user || !profile) return { error: "Oturum açmanız gerekiyor" };

  const isAdmin =
    profile.role === "super_admin" || profile.role === "admin";

  let query = supabase
    .from("support_tickets")
    .select(
      `
      *,
      user:profiles!support_tickets_user_id_fkey(id, full_name, email, role),
      agency:agencies!support_tickets_agency_id_fkey(id, name),
      replied_by_profile:profiles!support_tickets_replied_by_fkey(id, full_name)
    `
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  return { data: data ?? [] };
}

/**
 * Admin: talebe cevap ver (admin_reply + status güncelle).
 */
export async function replyToTicket(
  id: string,
  adminReply: string,
  newStatus: SupportTicketStatus = "in_progress"
): Promise<{ error?: string }> {
  const { supabase, user, profile } = await getAuthUserAndProfile();
  if (!user || !profile) return { error: "Oturum açmanız gerekiyor" };

  const isAdmin =
    profile.role === "super_admin" || profile.role === "admin";
  if (!isAdmin) return { error: "Yetki yok" };

  const { error } = await supabase
    .from("support_tickets")
    .update({
      admin_reply: adminReply.trim(),
      replied_at: new Date().toISOString(),
      replied_by: user.id,
      status: newStatus,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/support");
  return {};
}

/**
 * Admin: talebin durumunu güncelle.
 */
export async function updateTicketStatus(
  id: string,
  status: SupportTicketStatus
): Promise<{ error?: string }> {
  const { supabase, user, profile } = await getAuthUserAndProfile();
  if (!user || !profile) return { error: "Oturum açmanız gerekiyor" };

  const isAdmin =
    profile.role === "super_admin" || profile.role === "admin";
  if (!isAdmin) return { error: "Yetki yok" };

  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/support");
  return {};
}

/**
 * Kullanıcı: kendi talebini kapat.
 */
export async function closeSupportTicket(
  id: string
): Promise<{ error?: string }> {
  const { supabase, user, profile } = await getAuthUserAndProfile();
  if (!user || !profile) return { error: "Oturum açmanız gerekiyor" };

  const isAdmin =
    profile.role === "super_admin" || profile.role === "admin";

  const whereClause = isAdmin ? { id } : { id, user_id: user.id };

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "closed" })
    .match(whereClause);

  if (error) return { error: error.message };

  revalidatePath("/support");
  return {};
}
