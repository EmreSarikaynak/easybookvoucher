"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import type { Agency, Tour } from "@/lib/types";

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

export interface CatalogPageData {
  tours: Tour[];
  agencies: CatalogAgencyOption[];
  prices: CatalogPriceRow[];
  selectedAgencyId: string | null;
  selectedAgencyName: string | null;
  isAdmin: boolean;
}

function formatDbError(error: { message: string }): string {
  return error.message || "Veritabanı hatası";
}

function resolveDisplayPrice(
  storedAdult: number | null | undefined,
  storedChild: number | null | undefined,
  baseAdult: number | null | undefined,
  baseChild: number | null | undefined
): { price_adult: number; price_child: number } {
  const adult = storedAdult ?? 0;
  const child = storedChild ?? 0;
  return {
    price_adult: adult > 0 ? Math.round(adult) : Math.round(baseAdult ?? 0),
    price_child: child > 0 ? Math.round(child) : Math.round(baseChild ?? 0),
  };
}

export async function getCatalogPageData(
  agencyIdParam?: string | null
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
      .eq("currency", "EUR");
    priceRows = prices ?? [];
  }

  const priceByTour = new Map(priceRows.map((p) => [p.tour_id, p]));

  const prices: CatalogPriceRow[] = (tours ?? []).map((tour) => {
    const row = priceByTour.get(tour.id);
    const display = resolveDisplayPrice(
      row?.price_adult,
      row?.price_child,
      tour.base_price_adult_eur,
      tour.base_price_child_eur
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

  return {
    data: {
      tours: tours ?? [],
      agencies,
      prices,
      selectedAgencyId,
      selectedAgencyName,
      isAdmin: admin,
    },
  };
}

export async function saveCatalogPrices(
  agencyId: string,
  rows: Array<{ tour_id: string; price_adult: number; price_child: number }>
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
    currency: "EUR" as const,
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

export type { Agency, Tour };
