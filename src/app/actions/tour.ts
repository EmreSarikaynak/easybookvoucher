"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import { canManageTours, getCurrentUser } from "@/lib/auth-helpers";
import {
  primaryTranslationName,
  TOUR_LANGUAGES,
  type TourLang,
  type TourTranslationContent,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { translateTourBundle } from "@/lib/deepl";
import type { Agency, CurrencyType } from "@/lib/types";

async function assertTourAdmin(): Promise<{ error?: string }> {
  const profile = await getCurrentUser();
  if (!canManageTours(profile)) {
    return { error: "Bu işlem için yönetici yetkisi gerekir." };
  }
  return {};
}

export async function uploadTourImages(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

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
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

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
  departure_days?: string[];
  departure_time?: string | null;
  meeting_point?: string | null;
  catalog_background_url?: string | null;
}

/** Bir TourTranslationContent tamamen boş mu (kullanıcı hiçbir alan girmemiş mi)? */
function isLangEmpty(t: TourTranslationContent | undefined | null): boolean {
  if (!t) return true;
  const hasText =
    t.name?.trim() ||
    t.description?.trim() ||
    (t.highlights ?? []).some((x) => x.trim()) ||
    (t.details ?? []).some((x) => x.trim()) ||
    (t.included ?? []).some((x) => x.trim()) ||
    (t.excluded ?? []).some((x) => x.trim());
  return !hasText;
}

/**
 * TR doluysa, EN/RU/PL içinden tamamen boş olanları DeepL ile otomatik doldurur.
 * DEEPL_API_KEY tanımlı değilse veya çeviri başarısızsa sessizce mevcut değerleri korur
 * (kaydetme durmaz).
 */
async function autoTranslateEmptyLangs(
  translations: TourTranslations
): Promise<TourTranslations> {
  if (!process.env.DEEPL_API_KEY) return translations;
  const tr = translations.tr;
  if (!tr || isLangEmpty(tr)) return translations;

  const out: TourTranslations = { ...translations };
  const targets: TourLang[] = TOUR_LANGUAGES.filter(
    (l) => l !== "tr" && isLangEmpty(out[l])
  );
  if (!targets.length) return translations;

  try {
    await Promise.all(
      targets.map(async (lang) => {
        const r = await translateTourBundle(
          {
            name: tr.name,
            description: tr.description,
            highlights: tr.highlights ?? [],
            details: tr.details ?? [],
            included: tr.included ?? [],
            excluded: tr.excluded ?? [],
          },
          lang,
          "tr"
        );
        out[lang] = {
          name: r.name ?? "",
          description: r.description ?? "",
          highlights: r.highlights ?? [],
          details: r.details ?? [],
          included: r.included ?? [],
          excluded: r.excluded ?? [],
        };
      })
    );
  } catch (err) {
    console.error("auto-translate failed:", err);
    return translations; // sessiz fallback
  }
  return out;
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
    departure_days: payload.departure_days ?? [],
    departure_time: payload.departure_time || null,
    meeting_point: payload.meeting_point?.trim() || null,
    catalog_background_url: payload.catalog_background_url?.trim() || null,
  };
}

export async function createTour(payload: TourPayload) {
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

  const supabase = await createServerSupabaseClient();

  const filledTranslations = await autoTranslateEmptyLangs(payload.translations);
  const finalPayload: TourPayload = { ...payload, translations: filledTranslations };

  const { data, error } = await supabase
    .from("tours")
    .insert(buildTourRow(finalPayload))
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
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

  const supabase = await createServerSupabaseClient();

  const filledTranslations = await autoTranslateEmptyLangs(payload.translations);
  const finalPayload: TourPayload = { ...payload, translations: filledTranslations };

  const { error } = await supabase.from("tours").update(buildTourRow(finalPayload)).eq("id", id);

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
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

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
  const denied = await assertTourAdmin();
  if (denied.error) return denied;

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("tours").update({ is_active: false }).eq("id", id);

  if (error) {
    console.error("Tour delete error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours");
  return { success: true };
}
