"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import type { Agency, CurrencyType } from "@/lib/types";

export async function uploadTourImages(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const supabase = createServerSupabaseClient();
  const files = formData.getAll("files") as File[];

  if (!files?.length) {
    return { error: "Dosya seçilmedi" };
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!file?.size || !file?.name) continue;

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("tour-photos")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Tour image upload error:", error);
      return { error: formatDbError({ message: error.message }) };
    }

    const { data } = supabase.storage.from("tour-photos").getPublicUrl(fileName);
    urls.push(data.publicUrl);
  }

  if (urls.length === 0) return { error: "Geçerli resim yüklenemedi" };
  return { urls };
}

interface TourPayload {
  name: string;
  description: string | null;
  duration: string | null;
  default_price: number;
  currency: CurrencyType;
  pickup_locations: string[];
  images: string[];
  tour_url: string | null;
  is_active: boolean;
  tour_managers?: { name: string; phone: string }[];
  base_price_adult_eur?: number;
  base_price_child_eur?: number;
  base_price_adult_try?: number;
  base_price_child_try?: number;
}

export async function createTour(payload: TourPayload) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("tours").insert({
    name: payload.name,
    description: payload.description,
    duration: payload.duration,
    default_price: payload.default_price,
    currency: payload.currency,
    pickup_locations: payload.pickup_locations ?? [],
    images: payload.images ?? [],
    tour_url: payload.tour_url,
    is_active: payload.is_active,
    tour_managers: payload.tour_managers ?? [],
    base_price_adult_eur: payload.base_price_adult_eur ?? 0,
    base_price_child_eur: payload.base_price_child_eur ?? 0,
    base_price_adult_try: payload.base_price_adult_try ?? 0,
    base_price_child_try: payload.base_price_child_try ?? 0,
  });

  if (error) {
    console.error("Tour create error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true };
}

export async function updateTour(id: string, payload: TourPayload) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("tours")
    .update({
      name: payload.name,
      description: payload.description,
      duration: payload.duration,
      default_price: payload.default_price,
      currency: payload.currency,
      pickup_locations: payload.pickup_locations ?? [],
      images: payload.images ?? [],
      tour_url: payload.tour_url,
      is_active: payload.is_active,
      tour_managers: payload.tour_managers ?? [],
      base_price_adult_eur: payload.base_price_adult_eur ?? 0,
      base_price_child_eur: payload.base_price_child_eur ?? 0,
      base_price_adult_try: payload.base_price_adult_try ?? 0,
      base_price_child_try: payload.base_price_child_try ?? 0,
    })
    .eq("id", id);

  if (error) {
    console.error("Tour update error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true };
}

export async function getTourPricesData(
  tourId: string,
  agencyId?: string | null
): Promise<{ agencies: Agency[]; pricesData: Array<{ agency_id: string; currency: string; price: number; id?: string }> }> {
  const supabase = createServerSupabaseClient();

  let agencyQuery = supabase
    .from("agencies")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (agencyId) agencyQuery = agencyQuery.eq("id", agencyId);
  const { data: agencies } = await agencyQuery;
  const agenciesList = agencies ?? [];

  let pricesQuery = supabase
    .from("agency_tour_prices")
    .select("*")
    .eq("tour_id", tourId);
  if (agencyId) pricesQuery = pricesQuery.eq("agency_id", agencyId);
  const { data: pricesData } = await pricesQuery;

  return {
    agencies: agenciesList,
    pricesData: (pricesData ?? []).map((p) => ({
      agency_id: p.agency_id,
      currency: p.currency,
      price: p.price,
      id: p.id,
    })),
  };
}

export async function saveAgencyTourPrices(
  tourId: string,
  rows: Array<{ id?: string; agency_id: string; price: number; currency: CurrencyType }>
) {
  const supabase = createServerSupabaseClient();

  const upsertData = rows.map((r) => ({
    id: r.id,
    agency_id: r.agency_id,
    tour_id: tourId,
    price: r.price,
    currency: r.currency,
  }));

  const { error } = await supabase
    .from("agency_tour_prices")
    .upsert(upsertData, { onConflict: "agency_id,tour_id,currency" });

  if (error) {
    console.error("Agency tour prices save error:", error);
    return { error: formatDbError(error) };
  }
  revalidatePath("/tours");
  return { success: true };
}

export async function deleteTour(id: string) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("tours")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Tour delete error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true };
}
