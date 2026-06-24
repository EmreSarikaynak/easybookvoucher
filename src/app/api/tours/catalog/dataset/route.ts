/**
 * Tur Kataloğu dataset endpoint'i — JSON döner.
 *
 * Tarayıcı PDF'i kendi render ettiği için (Cloudflare Workers'da yoga WASM
 * çalışmıyor) bu endpoint sadece veri sağlar: tur listesi, fiyatlar, logo URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import { fetchCatalogPdfDataset } from "@/lib/tour-catalog-data";
import type { CatalogPdfCurrency } from "@/lib/tour-catalog-pdf";
import { getSetting } from "@/app/actions/settings";

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile || !canViewTours(profile)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let agencyId = request.nextUrl.searchParams.get("agencyId");
  const currencyParam = request.nextUrl.searchParams.get("currency");
  const currency: CatalogPdfCurrency = currencyParam === "TRY" ? "TRY" : "EUR";
  const admin = isAdmin(profile);
  if (!admin) agencyId = profile.agency_id ?? null;

  if (!agencyId) {
    return NextResponse.json(
      { error: "agencyId zorunludur" },
      { status: 400 }
    );
  }
  if (!admin && profile.agency_id !== agencyId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: dataset, error } = await fetchCatalogPdfDataset(
    supabase,
    agencyId,
    currency
  );

  if (!dataset || error) {
    return NextResponse.json(
      { error: error ?? "Aktif tur bulunamadı" },
      { status: 404 }
    );
  }

  const logoUrl = (await getSetting("site_logo")) as string | null;

  const { data: bgRows } = await supabase
    .from("catalog_page_backgrounds")
    .select("page_number, background_url");
  const pageBackgrounds: Record<number, string> = {};
  for (const row of bgRows ?? []) {
    if (row.page_number != null && row.background_url) {
      pageBackgrounds[row.page_number] = row.background_url;
    }
  }

  return NextResponse.json({
    tours: dataset.tours,
    prices: dataset.prices,
    agencyName: dataset.agencyName,
    tourCount: dataset.tourCount,
    currency,
    logoUrl,
    pageBackgrounds,
  });
}
