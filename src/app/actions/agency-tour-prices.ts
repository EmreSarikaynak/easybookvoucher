"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAgencyUser } from "@/lib/auth-helpers";
import { formatDbError } from "@/lib/error-messages";
import type { CurrencyType } from "@/lib/types";

export interface AgencyOwnPriceCell {
  tour_id: string;
  price_adult_eur: number;
  price_child_eur: number;
  price_adult_try: number;
  price_child_try: number;
}

/**
 * Acente kendi adına satış fiyatlarını kaydeder.
 * cost_adult/cost_child alanlarına dokunulmaz — admin'in yetki alanı.
 */
export async function saveOwnAgencyPrices(
  rows: AgencyOwnPriceCell[]
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getCurrentUser();

  if (!profile || !isAgencyUser(profile)) {
    return { error: "Yetkisiz" };
  }
  if (!profile.agency_id) {
    return { error: "Acenteniz bulunamadı" };
  }
  if (!rows.length) {
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const agencyId = profile.agency_id;

  const upsertData: Array<{
    agency_id: string;
    tour_id: string;
    currency: CurrencyType;
    price: number;
    price_adult: number;
    price_child: number;
  }> = [];

  for (const r of rows) {
    const adultEur = Math.max(0, Math.round(r.price_adult_eur || 0));
    const childEur = Math.max(0, Math.round(r.price_child_eur || 0));
    const adultTry = Math.max(0, Math.round(r.price_adult_try || 0));
    const childTry = Math.max(0, Math.round(r.price_child_try || 0));

    upsertData.push({
      agency_id: agencyId,
      tour_id: r.tour_id,
      currency: "EUR",
      price: adultEur,
      price_adult: adultEur,
      price_child: childEur,
    });
    upsertData.push({
      agency_id: agencyId,
      tour_id: r.tour_id,
      currency: "TRY",
      price: adultTry,
      price_adult: adultTry,
      price_child: childTry,
    });
  }

  const { error } = await supabase
    .from("agency_tour_prices")
    .upsert(upsertData, { onConflict: "agency_id,tour_id,currency" });

  if (error) {
    console.error("saveOwnAgencyPrices error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/tour-costs");
  revalidatePath("/tours/catalog");
  revalidatePath("/tours");
  revalidatePath("/vouchers/new");
  return { success: true };
}

export interface AgencyTourPriceLookup {
  price_adult: number;
  price_child: number;
  source: "agency" | "fallback";
}

/**
 * Voucher formu için fiyat lookup'ı.
 * Acentenin iTur'da kaydettiği satış fiyatını döner.
 * Acente henüz fiyat kaydetmemişse null döner — admin taban fiyatına fallback YOK.
 * Admin taban fiyatları yalnızca Tur Maliyetleri sayfasında ve
 * iTur ekranında varsayılan değer olarak gösterilir.
 */
export async function getAgencyTourPrice(
  agencyId: string,
  tourId: string,
  currency: CurrencyType
): Promise<AgencyTourPriceLookup | null> {
  const profile = await getCurrentUser();
  if (!profile) return null;

  const supabase = await createServerSupabaseClient();

  const { data: priceRow } = await supabase
    .from("agency_tour_prices")
    .select("price_adult, price_child")
    .eq("agency_id", agencyId)
    .eq("tour_id", tourId)
    .eq("currency", currency)
    .maybeSingle();

  if (priceRow && (priceRow.price_adult ?? 0) > 0) {
    return {
      price_adult: Number(priceRow.price_adult) || 0,
      price_child: Number(priceRow.price_child) || 0,
      source: "agency",
    };
  }

  // Acente fiyatı kaydetmemiş — fiyat yoktur, admin fiyatına fallback yapma
  return null;
}
