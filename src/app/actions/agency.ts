"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import { normalizeStoredPhone } from "@/lib/phone";
import type { CurrencyType, Tour } from "@/lib/types";

function normalizeAgencyPayload(payload: AgencyPayload): AgencyPayload {
  const phone = normalizeStoredPhone(payload.phone);
  return { ...payload, phone: phone ?? payload.phone.trim() };
}

interface AgencyPayload {
  name: string;
  phone: string;
  email: string;
  agency_code?: string;
}

interface CreateAgencyWithUserPayload extends AgencyPayload {
  password: string;
  admin_name: string;
}

/**
 * Bir sonraki acente kodunu üretir (2026001, 2026002, ...)
 */
async function generateNextAgencyCode(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<string> {
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
  payload = normalizeAgencyPayload(payload);
  const supabase = await createServerSupabaseClient();
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
  const normalized = normalizeAgencyPayload(payload);
  payload = { ...payload, ...normalized };
  const supabase = await createServerSupabaseClient();

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
  payload = normalizeAgencyPayload(payload);
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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

// ──────────────────────────────────────────────────────────────────────────
// Per-agency tour pricing matrix
// ──────────────────────────────────────────────────────────────────────────

export interface AgencyTourPricingCell {
  /** Existing row id (if any) for this (tour, currency) */
  id?: string;
  tour_id: string;
  currency: CurrencyType;
  cost_adult: number | null;
  cost_child: number | null;
  price_adult: number | null;
  price_child: number;
}

export interface AgencyTourPricingMatrix {
  tours: Tour[];
  cells: AgencyTourPricingCell[];
}

/**
 * Returns all active tours plus this agency's saved price/cost cells
 * (one row per tour × currency). Missing combinations are simply absent
 * from `cells` — the UI fills them with fallbacks from tours.base_price_*.
 */
export async function getAgencyTourPricingMatrix(
  agencyId: string
): Promise<{ data?: AgencyTourPricingMatrix; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const [{ data: tours, error: toursError }, { data: rows, error: rowsError }] =
    await Promise.all([
      supabase
        .from("tours")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("agency_tour_prices")
        .select("*")
        .eq("agency_id", agencyId),
    ]);

  if (toursError) return { error: formatDbError(toursError) };
  if (rowsError) return { error: formatDbError(rowsError) };

  const cells: AgencyTourPricingCell[] = (rows ?? []).map((r) => ({
    id: r.id,
    tour_id: r.tour_id,
    currency: r.currency,
    cost_adult: r.cost_adult ?? null,
    cost_child: r.cost_child ?? null,
    price_adult: r.price_adult ?? r.price ?? null,
    price_child: r.price_child ?? 0,
  }));

  return { data: { tours: tours ?? [], cells } };
}

export async function saveAgencyTourPricingMatrix(
  agencyId: string,
  cells: AgencyTourPricingCell[]
) {
  if (!cells.length) return { success: true };

  const supabase = await createServerSupabaseClient();

  const upsertData = cells.map((c) => {
    const adult = c.price_adult ?? 0;
    return {
      ...(c.id ? { id: c.id } : {}),
      agency_id: agencyId,
      tour_id: c.tour_id,
      currency: c.currency,
      // Keep legacy `price` mirrored so old readers don't break.
      price: adult,
      price_adult: adult,
      price_child: c.price_child ?? 0,
      cost_adult: c.cost_adult,
      cost_child: c.cost_child,
    };
  });

  const { error } = await supabase
    .from("agency_tour_prices")
    .upsert(upsertData, { onConflict: "agency_id,tour_id,currency" });

  if (error) {
    console.error("Agency tour pricing save error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/agencies");
  revalidatePath("/tours");
  revalidatePath("/tour-costs");
  return { success: true };
}
