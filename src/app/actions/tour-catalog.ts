"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import type { Agency, Tour } from "@/lib/types";

export type CatalogCurrency = "EUR" | "TRY";

export interface CatalogPriceRow {
  tour_id: string;
  price_id?: string;
  price_adult: number;
  price_child: number;
}

export interface CatalogAgencyOption {
  id: string;
  name: string;
}

export interface CatalogTourLayoutEntry {
  page_number: number;
  slot: 0 | 1;
}

export interface CatalogPageData {
  tours: Tour[];
  agencies: CatalogAgencyOption[];
  prices: CatalogPriceRow[];
  selectedAgencyId: string | null;
  selectedAgencyName: string | null;
  currency: CatalogCurrency;
  isAdmin: boolean;
  pageBackgrounds: Record<number, string>;
  tourLayout: Record<string, CatalogTourLayoutEntry>;
}

function formatDbError(error: { message: string }): string {
  return error.message || "Veritabanı hatası";
}

/**
 * Acentenin kaydettiği satış fiyatını döner.
 * Fiyat yoksa 0 — admin base_price'a fallback YAPILMAZ.
 * Admin taban fiyatları yalnızca Tur Maliyetleri + iTur varsayılan olarak kullanılır.
 * baseAdult/baseChild parametreleri kaldırıldı; signature geriye dönük uyumluluk için tutulur.
 */
function resolveDisplayPrice(
  storedAdult: number | null | undefined,
  storedChild: number | null | undefined,
  _baseAdult?: number | null | undefined,
  _baseChild?: number | null | undefined
): { price_adult: number; price_child: number } {
  return {
    price_adult: storedAdult != null && storedAdult > 0 ? Math.round(storedAdult) : 0,
    price_child: storedChild != null && storedChild > 0 ? Math.round(storedChild) : 0,
  };
}

export async function getCatalogPageData(
  agencyIdParam?: string | null,
  currency: CatalogCurrency = "EUR"
): Promise<{ data: CatalogPageData | null; error?: string }> {
  const profile = await getCurrentUser();
  if (!canViewTours(profile)) {
    return { data: null, error: "Yetkisiz" };
  }

  const supabase = await createServerSupabaseClient();
  const admin = isAdmin(profile);

  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (toursError) {
    return { data: null, error: formatDbError(toursError) };
  }

  let agencies: CatalogAgencyOption[] = [];
  let selectedAgencyId: string | null = null;

  if (admin) {
    const { data: agencyRows } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    agencies = (agencyRows ?? []).map((a) => ({ id: a.id, name: a.name }));

    if (agencyIdParam && agencies.some((a) => a.id === agencyIdParam)) {
      selectedAgencyId = agencyIdParam;
    } else if (agencies.length > 0) {
      selectedAgencyId = agencies[0].id;
    }
  } else if (profile?.agency_id) {
    selectedAgencyId = profile.agency_id;
    const { data: ownAgency } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("id", profile.agency_id)
      .single();
    if (ownAgency) {
      agencies = [{ id: ownAgency.id, name: ownAgency.name }];
    }
  }

  let priceRows: Array<{
    id: string;
    tour_id: string;
    price_adult: number | null;
    price_child: number | null;
  }> = [];

  if (selectedAgencyId) {
    const { data: prices } = await supabase
      .from("agency_tour_prices")
      .select("id, tour_id, price_adult, price_child")
      .eq("agency_id", selectedAgencyId)
      .eq("currency", currency);
    priceRows = prices ?? [];
  }

  const priceByTour = new Map(priceRows.map((p) => [p.tour_id, p]));

  const prices: CatalogPriceRow[] = (tours ?? []).map((tour) => {
    const row = priceByTour.get(tour.id);
    const baseAdult =
      currency === "EUR" ? tour.base_price_adult_eur : tour.base_price_adult_try;
    const baseChild =
      currency === "EUR" ? tour.base_price_child_eur : tour.base_price_child_try;
    const display = resolveDisplayPrice(
      row?.price_adult,
      row?.price_child,
      baseAdult,
      baseChild
    );
    return {
      tour_id: tour.id,
      price_id: row?.id,
      price_adult: display.price_adult,
      price_child: display.price_child,
    };
  });

  const selectedAgencyName =
    agencies.find((a) => a.id === selectedAgencyId)?.name ?? null;

  const { data: bgRows } = await supabase
    .from("catalog_page_backgrounds")
    .select("page_number, background_url");
  const pageBackgrounds: Record<number, string> = {};
  for (const row of bgRows ?? []) {
    if (row.page_number != null && row.background_url) {
      pageBackgrounds[row.page_number] = row.background_url;
    }
  }

  const { data: layoutRows } = await supabase
    .from("catalog_tour_layout")
    .select("tour_id, page_number, slot");
  const tourLayout: Record<string, CatalogTourLayoutEntry> = {};
  for (const row of layoutRows ?? []) {
    if (row.tour_id && row.page_number != null && (row.slot === 0 || row.slot === 1)) {
      tourLayout[row.tour_id] = {
        page_number: row.page_number,
        slot: row.slot as 0 | 1,
      };
    }
  }

  return {
    data: {
      tours: tours ?? [],
      agencies,
      prices,
      selectedAgencyId,
      selectedAgencyName,
      currency,
      isAdmin: admin,
      pageBackgrounds,
      tourLayout,
    },
  };
}

export async function saveCatalogPrices(
  agencyId: string,
  rows: Array<{ tour_id: string; price_adult: number; price_child: number }>,
  currency: CatalogCurrency = "EUR"
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!canViewTours(profile)) {
    return { error: "Yetkisiz" };
  }

  const admin = isAdmin(profile);
  if (!admin) {
    if (!profile?.agency_id || profile.agency_id !== agencyId) {
      return { error: "Bu acente için kayıt yetkiniz yok" };
    }
  }

  if (!agencyId) {
    return { error: "Acente seçilmedi" };
  }

  const supabase = await createServerSupabaseClient();

  const upsertData = rows.map((r) => ({
    agency_id: agencyId,
    tour_id: r.tour_id,
    currency,
    price: Math.round(r.price_adult),
    price_adult: Math.round(r.price_adult),
    price_child: Math.round(r.price_child),
  }));

  const { error } = await supabase
    .from("agency_tour_prices")
    .upsert(upsertData, { onConflict: "agency_id,tour_id,currency" });

  if (error) {
    console.error("saveCatalogPrices error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours/catalog");
  revalidatePath("/tours");
  revalidatePath("/tour-costs");
  return { success: true };
}

/** PDF API için acente erişim doğrulama */
export async function assertCatalogAgencyAccess(
  agencyId: string
): Promise<{ ok: boolean; agencyName: string | null; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile) return { ok: false, agencyName: null, error: "Oturum gerekli" };

  if (!canViewTours(profile)) {
    return { ok: false, agencyName: null, error: "Yetkisiz" };
  }

  const admin = isAdmin(profile);
  if (!admin && profile.agency_id !== agencyId) {
    return { ok: false, agencyName: null, error: "Yetkisiz" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  if (!agency) {
    return { ok: false, agencyName: null, error: "Acente bulunamadı" };
  }

  return { ok: true, agencyName: agency.name };
}

// --- Katalog sayfa arkaplanları (global, admin-only) ---

export async function getCatalogPageBackgrounds(): Promise<{
  data: Record<number, string>;
  error?: string;
}> {
  const profile = await getCurrentUser();
  if (!canViewTours(profile)) {
    return { data: {}, error: "Yetkisiz" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("catalog_page_backgrounds")
    .select("page_number, background_url");

  if (error) {
    console.error("getCatalogPageBackgrounds error:", error);
    return { data: {}, error: formatDbError(error) };
  }

  const result: Record<number, string> = {};
  for (const row of data ?? []) {
    if (row.page_number != null && row.background_url) {
      result[row.page_number] = row.background_url;
    }
  }
  return { data: result };
}

export async function uploadCatalogPageBackground(
  pageNumber: number,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile || !isAdmin(profile)) {
    return { error: "Bu işlem için yönetici yetkisi gerekir." };
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return { error: "Geçersiz sayfa numarası" };
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.size || !file.name) {
    return { error: "Dosya seçilmedi" };
  }

  const supabase = await createServerSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `catalog-bg/page-${pageNumber}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("tour-photos")
    .upload(fileName, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Catalog bg upload error:", uploadError);
    return { error: formatDbError({ message: uploadError.message }) };
  }

  const { data: publicData } = supabase.storage
    .from("tour-photos")
    .getPublicUrl(fileName);
  const publicUrl = publicData.publicUrl;

  const { error: dbError } = await supabase
    .from("catalog_page_backgrounds")
    .upsert(
      {
        page_number: pageNumber,
        background_url: publicUrl,
        updated_by: profile.id,
      },
      { onConflict: "page_number" }
    );

  if (dbError) {
    console.error("Catalog bg upsert error:", dbError);
    return { error: formatDbError(dbError) };
  }

  revalidatePath("/tours/catalog");
  return { url: publicUrl };
}

export async function deleteCatalogPageBackground(
  pageNumber: number
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile || !isAdmin(profile)) {
    return { error: "Bu işlem için yönetici yetkisi gerekir." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("catalog_page_backgrounds")
    .delete()
    .eq("page_number", pageNumber);

  if (error) {
    console.error("Catalog bg delete error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tours/catalog");
  return { success: true };
}

// --- Katalog tur layout (admin-only) ---

export interface CatalogTourLayoutRow {
  tour_id: string;
  page_number: number;
  slot: 0 | 1;
}

/**
 * Tüm tur layout satırlarını verilen kümeyle değiştirir.
 * Atomik bir transaction değildir — delete + insert iki adımda yürür.
 * UNIQUE(page_number, slot) constraint'i nedeniyle çakışan satırlar
 * tek bir batch insert'te uygulanmadan tüm eski satırlar temizlenir.
 */
export async function saveCatalogTourLayout(
  rows: CatalogTourLayoutRow[]
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!profile || !isAdmin(profile)) {
    return { error: "Bu işlem için yönetici yetkisi gerekir." };
  }

  for (const r of rows) {
    if (!r.tour_id) return { error: "Geçersiz tour_id" };
    if (!Number.isInteger(r.page_number) || r.page_number < 1) {
      return { error: "Geçersiz page_number" };
    }
    if (r.slot !== 0 && r.slot !== 1) {
      return { error: "slot 0 veya 1 olmalıdır" };
    }
  }

  // Dedup: aynı tour_id veya aynı (page_number, slot) birden fazla gelmesin.
  const seenTour = new Set<string>();
  const seenSlot = new Set<string>();
  for (const r of rows) {
    if (seenTour.has(r.tour_id)) {
      return { error: "Aynı tur birden fazla kez atanmış" };
    }
    seenTour.add(r.tour_id);
    const key = `${r.page_number}-${r.slot}`;
    if (seenSlot.has(key)) {
      return { error: `Sayfa ${r.page_number} slot ${r.slot} birden fazla kez atanmış` };
    }
    seenSlot.add(key);
  }

  const supabase = await createServerSupabaseClient();

  // Tüm mevcut satırları sil (RLS admin tarafından izinli).
  const { error: deleteError } = await supabase
    .from("catalog_tour_layout")
    .delete()
    .gte("page_number", 1);

  if (deleteError) {
    console.error("Catalog tour layout delete error:", deleteError);
    return { error: formatDbError(deleteError) };
  }

  if (rows.length === 0) {
    revalidatePath("/tours/catalog");
    return { success: true };
  }

  const insertRows = rows.map((r) => ({
    tour_id: r.tour_id,
    page_number: r.page_number,
    slot: r.slot,
    updated_by: profile.id,
  }));

  const { error: insertError } = await supabase
    .from("catalog_tour_layout")
    .insert(insertRows);

  if (insertError) {
    console.error("Catalog tour layout insert error:", insertError);
    return { error: formatDbError(insertError) };
  }

  revalidatePath("/tours/catalog");
  return { success: true };
}

export type { Agency, Tour };
