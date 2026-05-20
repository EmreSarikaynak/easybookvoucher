"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import {
  primaryTranslationName,
  type TourTranslations,
} from "@/lib/tour-i18n";
import type { Agency, CurrencyType } from "@/lib/types";

export async function uploadTourImages(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
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

export async function uploadTourVideos(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const files = formData.getAll("files") as File[];

  if (!files?.length) {
    return { error: "Dosya seçilmedi" };
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!file?.size || !file?.name) continue;

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("tour-videos")
      .upload(fileName, buffer, {
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Tour video upload error:", error);
      return { error: formatDbError({ message: error.message }) };
    }

    const { data } = supabase.storage.from("tour-videos").getPublicUrl(fileName);
    urls.push(data.publicUrl);
  }

  if (urls.length === 0) return { error: "Geçerli video yüklenemedi" };
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
  videos: string[];
  translations: TourTranslations;
  tour_url: string | null;
  is_active: boolean;
  tour_managers?: { name: string; phone: string }[];
  base_price_adult_eur?: number;
  base_price_child_eur?: number;
  base_price_adult_try?: number;
  base_price_child_try?: number;
}

function buildTourRow(payload: TourPayload) {
  const primaryName = primaryTranslationName(payload.translations) || payload.name;
  const trDesc = payload.translations.tr?.description?.trim() || payload.description;

  return {
    name: primaryName,
    description: trDesc || null,
    duration: payload.duration,
    default_price: payload.default_price,
    currency: payload.currency,
    pickup_locations: payload.pickup_locations ?? [],
    images: payload.images ?? [],
    videos: payload.videos ?? [],
    translations: payload.translations ?? {},
    tour_url: payload.tour_url,
    is_active: payload.is_active,
    tour_managers: payload.tour_managers ?? [],
    base_price_adult_eur: payload.base_price_adult_eur ?? 0,
    base_price_child_eur: payload.base_price_child_eur ?? 0,
    base_price_adult_try: payload.base_price_adult_try ?? 0,
    base_price_child_try: payload.base_price_child_try ?? 0,
  };
}

export async function createTour(payload: TourPayload) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tours")
    .insert(buildTourRow(payload))
    .select("id")
    .single();

  if (error) {
    console.error("Tour create error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true, id: data?.id as string };
}

export async function updateTour(id: string, payload: TourPayload) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("tours").update(buildTourRow(payload)).eq("id", id);

  if (error) {
    console.error("Tour update error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  revalidatePath(`/tours/${id}`);
  revalidatePath(`/tour/${id}`);
  return { success: true };
}

export async function getTourById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("tours").select("*").eq("id", id).single();

  if (error) {
    return { tour: null, error: formatDbError(error) };
  }
  return { tour: data, error: null };
}

export interface AgencyTourPriceRow {
  id?: string;
  agency_id: string;
  currency: CurrencyType;
  /** legacy single price, kept so old UI still works */
  price: number;
  price_adult: number | null;
  price_child: number;
  cost_adult: number | null;
  cost_child: number | null;
}

export async function getTourPricesData(
  tourId: string,
  agencyId?: string | null
): Promise<{ agencies: Agency[]; pricesData: AgencyTourPriceRow[] }> {
  const supabase = await createServerSupabaseClient();

  let agencyQuery = supabase
    .from("agencies")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (agencyId) agencyQuery = agencyQuery.eq("id", agencyId);
  const { data: agencies } = await agencyQuery;
  const agenciesList = agencies ?? [];

  let pricesQuery = supabase.from("agency_tour_prices").select("*").eq("tour_id", tourId);
  if (agencyId) pricesQuery = pricesQuery.eq("agency_id", agencyId);
  const { data: pricesData } = await pricesQuery;

  return {
    agencies: agenciesList,
    pricesData: (pricesData ?? []).map((p) => ({
      id: p.id,
      agency_id: p.agency_id,
      currency: p.currency,
      price: p.price ?? p.price_adult ?? 0,
      price_adult: p.price_adult ?? p.price ?? null,
      price_child: p.price_child ?? 0,
      cost_adult: p.cost_adult ?? null,
      cost_child: p.cost_child ?? null,
    })),
  };
}

export async function saveAgencyTourPrices(
  tourId: string,
  rows: Array<{
    id?: string;
    agency_id: string;
    currency: CurrencyType;
    price?: number;
    price_adult?: number | null;
    price_child?: number;
    cost_adult?: number | null;
    cost_child?: number | null;
  }>
) {
  const supabase = await createServerSupabaseClient();

  const upsertData = rows.map((r) => {
    const adult = r.price_adult ?? r.price ?? 0;
    return {
      ...(r.id ? { id: r.id } : {}),
      agency_id: r.agency_id,
      tour_id: tourId,
      currency: r.currency,
      price: adult,
      price_adult: adult,
      price_child: r.price_child ?? 0,
      cost_adult: r.cost_adult ?? null,
      cost_child: r.cost_child ?? null,
    };
  });

  const { error } = await supabase
    .from("agency_tour_prices")
    .upsert(upsertData, { onConflict: "agency_id,tour_id,currency" });

  if (error) {
    console.error("Agency tour prices save error:", error);
    return { error: formatDbError(error) };
  }
  revalidatePath("/tours");
  revalidatePath("/agencies");
  revalidatePath("/tour-costs");
  return { success: true };
}

export interface TourBasePriceUpdate {
  tour_id: string;
  base_price_adult_eur: number;
  base_price_child_eur: number;
  base_price_adult_try: number;
  base_price_child_try: number;
}

export async function updateTourBasePrices(updates: TourBasePriceUpdate[]) {
  if (!updates.length) return { success: true };

  const supabase = await createServerSupabaseClient();
  const errors: string[] = [];

  for (const u of updates) {
    const { error } = await supabase
      .from("tours")
      .update({
        base_price_adult_eur: u.base_price_adult_eur,
        base_price_child_eur: u.base_price_child_eur,
        base_price_adult_try: u.base_price_adult_try,
        base_price_child_try: u.base_price_child_try,
      })
      .eq("id", u.tour_id);

    if (error) {
      console.error("Tour base price update error:", error);
      errors.push(formatDbError(error));
    }
  }

  revalidatePath("/tour-costs");
  revalidatePath("/tours");
  revalidatePath("/agencies");

  if (errors.length > 0) {
    return { error: errors.join("; ") };
  }
  return { success: true };
}

export async function deleteTour(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("tours").update({ is_active: false }).eq("id", id);

  if (error) {
    console.error("Tour delete error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true };
}
