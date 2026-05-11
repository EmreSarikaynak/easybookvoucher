"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";

interface AgencyPayload {
  name: string;
  phone: string;
  email: string;
  commission_rate: number;
  agency_code?: string;
}

interface CreateAgencyWithUserPayload extends AgencyPayload {
  password: string;
  admin_name: string;
}

/**
 * Bir sonraki acente kodunu üretir (2026001, 2026002, ...)
 */
async function generateNextAgencyCode(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string> {
  const { data } = await supabase
    .from("agencies")
    .select("agency_code")
    .ilike("agency_code", "2026%")
    .order("agency_code", { ascending: false })
    .limit(1)
    .single();

  if (data?.agency_code) {
    const numericPart = parseInt(data.agency_code.slice(4), 10);
    if (!isNaN(numericPart)) {
      return "2026" + String(numericPart + 1).padStart(3, "0");
    }
  }

  return "2026001"; // İlk acente kodu
}

export async function createAgency(payload: AgencyPayload) {
  const supabase = createServerSupabaseClient();
  const agencyCode = payload.agency_code || await generateNextAgencyCode(supabase);

  const { error } = await supabase.from("agencies").insert({
    ...payload,
    agency_code: agencyCode,
    is_active: true,
  });

  if (error) {
    console.error("Agency create error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/agencies");
  return { success: true };
}

export async function createAgencyWithUser(payload: CreateAgencyWithUserPayload) {
  const supabase = createServerSupabaseClient();

  try {
    const serviceClient = createServiceRoleClient();
    const agencyCode = payload.agency_code || await generateNextAgencyCode(supabase);

    // 1. Önce acente oluştur
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .insert({
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        commission_rate: payload.commission_rate,
        agency_code: agencyCode,
        is_active: true,
      })
      .select()
      .single();

    if (agencyError) {
      console.error("Agency create error:", agencyError);
      return { error: formatDbError(agencyError) };
    }

    // 2. Kullanıcı oluştur (Supabase Auth)
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // E-posta onayı otomatik
      user_metadata: {
        full_name: payload.admin_name,
      },
    });

    if (authError) {
      await supabase.from("agencies").delete().eq("id", agency.id);
      console.error("User create error:", authError);
      return { error: formatDbError({ message: authError.message }) };
    }

    // 3. Profil oluştur/güncelle (trigger zaten profil oluşturmuş olabilir → upsert)
    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email: payload.email,
          full_name: payload.admin_name,
          role: "agency_admin",
          agency_id: agency.id,
          phone: payload.phone,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      await supabase.from("agencies").delete().eq("id", agency.id);
      console.error("Profile create error:", profileError);
      return { error: formatDbError(profileError) };
    }

    revalidatePath("/agencies");
    return { success: true, agencyId: agency.id };
  } catch (err) {
    console.error("Create agency with user error:", err);
    return { error: "Beklenmeyen bir hata oluştu" };
  }
}

export async function updateAgency(id: string, payload: AgencyPayload) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("agencies")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Agency update error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/agencies");
  return { success: true };
}

export async function deleteAgency(id: string) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("agencies")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Agency delete error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/agencies");
  return { success: true };
}
