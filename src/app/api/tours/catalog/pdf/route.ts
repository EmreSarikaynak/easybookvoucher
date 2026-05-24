import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import {
  CATALOG_LANGUAGES,
  type CatalogLang,
} from "@/lib/tour-i18n";
import {
  generateTourCatalogPdfBuffer,
  type CatalogPdfCurrency,
} from "@/lib/tour-catalog-pdf";
import { fetchCatalogPdfDataset } from "@/lib/tour-catalog-data";
import { getSetting } from "@/app/actions/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile || !canViewTours(profile)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const langParam = request.nextUrl.searchParams.get("lang") || "tr";
  const lang = (
    CATALOG_LANGUAGES.includes(langParam as CatalogLang) ? langParam : "tr"
  ) as CatalogLang;

  let agencyId = request.nextUrl.searchParams.get("agencyId");
  const currencyParam = request.nextUrl.searchParams.get("currency");
  const currency: CatalogPdfCurrency = currencyParam === "TRY" ? "TRY" : "EUR";
  const admin = isAdmin(profile);

  if (!admin) {
    agencyId = profile.agency_id ?? null;
  }

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
  const { data: dataset, error: dataError } = await fetchCatalogPdfDataset(
    supabase,
    agencyId,
    currency
  );

  if (!dataset || dataError) {
    return NextResponse.json(
      { error: dataError ?? "Aktif tur bulunamadı" },
      { status: 404 }
    );
  }

  try {
    const logoUrl = (await getSetting("site_logo")) as string | null;
    const baseUrl =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://bodrumdayiz.com.tr";
    const buffer = await generateTourCatalogPdfBuffer({
      tours: dataset.tours,
      prices: dataset.prices,
      lang,
      agencyName: dataset.agencyName,
      logoUrl,
      currency,
      baseUrl,
    });

    const safeAgency = dataset.agencyName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 30);
    const filename = `tur-katalogu-${safeAgency}-${currency.toLowerCase()}-${lang}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("Catalog PDF error:", e);
    return NextResponse.json(
      { error: "PDF oluşturulamadı", detail: msg },
      { status: 500 }
    );
  }
}
