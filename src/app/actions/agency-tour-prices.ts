"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentUser, isAgencyUser } from "@/lib/auth-helpers";
import { formatDbError } from "@/lib/error-messages";
import {
  loadExchangeRatePairsForCalculation,
  resolveAgencyAmountInCurrency,
  resolveTourBaseInCurrency,
} from "@/lib/exchange-rates";
import { resolvePerPaxCost } from "@/lib/pricing";
import type { CurrencyType } from "@/lib/types";

export interface AgencyOwnPriceCell {
  tour_id: string;
  price_adult_eur: number;
  price_child_eur: number;
  price_infant_eur: number;
  price_adult_try: number;
  price_child_try: number;
  price_infant_try: number;
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
    price_infant: number;
  }> = [];

  for (const r of rows) {
    const adultEur = Math.max(0, Math.round(r.price_adult_eur || 0));
    const childEur = Math.max(0, Math.round(r.price_child_eur || 0));
    const infantEur = Math.max(0, Math.round(r.price_infant_eur || 0));
    const adultTry = Math.max(0, Math.round(r.price_adult_try || 0));
    const childTry = Math.max(0, Math.round(r.price_child_try || 0));
    const infantTry = Math.max(0, Math.round(r.price_infant_try || 0));

    upsertData.push({
      agency_id: agencyId,
      tour_id: r.tour_id,
      currency: "EUR",
      price: adultEur,
      price_adult: adultEur,
      price_child: childEur,
      price_infant: infantEur,
    });
    upsertData.push({
      agency_id: agencyId,
      tour_id: r.tour_id,
      currency: "TRY",
      price: adultTry,
      price_adult: adultTry,
      price_child: childTry,
      price_infant: infantTry,
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
  price_infant: number;
  source: "agency" | "fallback";
  /** TRUE ise fiyat kişi başı değil rezervasyon başıdır (ör. ATV Double). */
  price_per_booking: boolean;
  /** TRUE ise bu turda bebek fiyatlanır (tours.infant_pricing_enabled). */
  infant_pricing_enabled: boolean;
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

  const [{ pairs }, priceRes, priceEurRes, tourRes] = await Promise.all([
    loadExchangeRatePairsForCalculation(),
    supabase
      .from("agency_tour_prices")
      .select("price_adult, price_child, price_infant")
      .eq("agency_id", agencyId)
      .eq("tour_id", tourId)
      .eq("currency", currency)
      .maybeSingle(),
    currency !== "EUR"
      ? supabase
          .from("agency_tour_prices")
          .select("price_adult, price_child, price_infant")
          .eq("agency_id", agencyId)
          .eq("tour_id", tourId)
          .eq("currency", "EUR")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("tours")
      .select("price_per_booking, infant_pricing_enabled")
      .eq("id", tourId)
      .maybeSingle(),
  ]);

  const resolved = resolveAgencyAmountInCurrency(
    currency,
    priceRes.data?.price_adult,
    priceRes.data?.price_child,
    priceRes.data?.price_infant,
    priceEurRes.data?.price_adult,
    priceEurRes.data?.price_child,
    priceEurRes.data?.price_infant,
    pairs
  );

  if (resolved.adult != null || resolved.child != null || resolved.infant != null) {
    return {
      price_adult: resolved.adult ?? 0,
      price_child: resolved.child ?? 0,
      price_infant: resolved.infant ?? 0,
      source: "agency",
      price_per_booking: tourRes.data?.price_per_booking ?? false,
      infant_pricing_enabled: tourRes.data?.infant_pricing_enabled ?? false,
    };
  }

  return null;
}

export interface AgencyTourCostLookup {
  cost_adult: number;
  cost_child: number;
  cost_infant: number;
  /** Maliyet kaynağı yok (EUR taban fiyat girilmemiş). */
  missing: boolean;
  /** TRUE ise bu turda bebek fiyatlanır (tours.infant_pricing_enabled). */
  infant_pricing_enabled: boolean;
}

/**
 * Voucher formu için EasyBook maliyet lookup'ı.
 * EUR taban maliyet + güncel kurlarla hedef para birimine çevrilir.
 */
export async function getAgencyTourCost(
  agencyId: string,
  tourId: string,
  currency: CurrencyType
): Promise<AgencyTourCostLookup | null> {
  const profile = await getCurrentUser();
  if (!profile) return null;

  const supabase = await createServerSupabaseClient();

  const [{ pairs }, costRes, costEurRes, tourRes] = await Promise.all([
    loadExchangeRatePairsForCalculation(),
    supabase
      .from("agency_tour_prices")
      .select("cost_adult, cost_child, cost_infant")
      .eq("agency_id", agencyId)
      .eq("tour_id", tourId)
      .eq("currency", currency)
      .maybeSingle(),
    currency !== "EUR"
      ? supabase
          .from("agency_tour_prices")
          .select("cost_adult, cost_child, cost_infant")
          .eq("agency_id", agencyId)
          .eq("tour_id", tourId)
          .eq("currency", "EUR")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("tours")
      .select(
        "base_price_adult_eur, base_price_child_eur, base_price_infant_eur, base_price_adult_try, base_price_child_try, base_price_infant_try, infant_pricing_enabled"
      )
      .eq("id", tourId)
      .maybeSingle(),
  ]);

  const agencyAmounts = resolveAgencyAmountInCurrency(
    currency,
    costRes.data?.cost_adult,
    costRes.data?.cost_child,
    costRes.data?.cost_infant,
    costEurRes.data?.cost_adult,
    costEurRes.data?.cost_child,
    costEurRes.data?.cost_infant,
    pairs
  );

  const base = resolveTourBaseInCurrency(
    currency,
    tourRes.data?.base_price_adult_eur,
    tourRes.data?.base_price_child_eur,
    tourRes.data?.base_price_infant_eur,
    tourRes.data?.base_price_adult_try,
    tourRes.data?.base_price_child_try,
    tourRes.data?.base_price_infant_try,
    pairs
  );

  const cost = resolvePerPaxCost(
    agencyAmounts.adult,
    agencyAmounts.child,
    agencyAmounts.infant,
    base.adult,
    base.child,
    base.infant
  );

  return {
    cost_adult: cost.cost_adult,
    cost_child: cost.cost_child,
    cost_infant: cost.cost_infant,
    missing: cost.missing_adult && cost.missing_child,
    infant_pricing_enabled: tourRes.data?.infant_pricing_enabled ?? false,
  };
}
