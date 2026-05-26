"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentUser, isAgencyUser } from "@/lib/auth-helpers";
import { formatDbError } from "@/lib/error-messages";
import { resolvePerPaxCost } from "@/lib/pricing";
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

  // RLS agency_tour_prices üzerinde INSERT/UPDATE policy istemediği için
  // service-role kullanılıyor. Yetki kontrolü yukarıda (isAgencyUser) yapıldı;
  // agency_id upsert payload'ına zorla yazıldığından kullanıcı başka
  // acentenin satırına dokunamaz.
  const supabase = createServiceRoleClient();
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

export interface AgencyTourCostLookup {
  cost_adult: number;
  cost_child: number;
  /** Maliyet kaynağı yok (taban fiyat girilmemiş / USD-GBP) — uyarı gösterilmemeli. */
  missing: boolean;
}

/**
 * Voucher formu için EasyBook maliyet lookup'ı.
 * Önce acente bazlı cost override'ı (agency_tour_prices.cost_*), yoksa
 * turun currency'e duyarlı taban fiyatına (tours.base_price_*) düşer.
 * EUR/TRY dışında taban fiyat olmadığı için USD/GBP'de missing=true döner.
 */
export async function getAgencyTourCost(
  agencyId: string,
  tourId: string,
  currency: CurrencyType
): Promise<AgencyTourCostLookup | null> {
  const profile = await getCurrentUser();
  if (!profile) return null;

  const supabase = await createServerSupabaseClient();

  const { data: costRow } = await supabase
    .from("agency_tour_prices")
    .select("cost_adult, cost_child")
    .eq("agency_id", agencyId)
    .eq("tour_id", tourId)
    .eq("currency", currency)
    .maybeSingle();

  const { data: tour } = await supabase
    .from("tours")
    .select(
      "base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try"
    )
    .eq("id", tourId)
    .maybeSingle();

  const baseAdult =
    currency === "EUR"
      ? tour?.base_price_adult_eur
      : currency === "TRY"
        ? tour?.base_price_adult_try
        : null;
  const baseChild =
    currency === "EUR"
      ? tour?.base_price_child_eur
      : currency === "TRY"
        ? tour?.base_price_child_try
        : null;

  const cost = resolvePerPaxCost(
    costRow?.cost_adult,
    costRow?.cost_child,
    baseAdult,
    baseChild
  );

  return {
    cost_adult: cost.cost_adult,
    cost_child: cost.cost_child,
    missing: cost.missing_adult && cost.missing_child,
  };
}
