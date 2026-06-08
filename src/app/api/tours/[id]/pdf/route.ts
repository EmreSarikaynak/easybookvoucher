import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateTourPdfBuffer } from "@/lib/tour-pdf-server";
import { TOUR_LANGUAGES, type TourLang } from "@/lib/tour-i18n";
import { fetchAgencyTourPriceMap } from "@/lib/tour-catalog-data";
import type { Tour } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const langParam = request.nextUrl.searchParams.get("lang") || "tr";
  const lang = (TOUR_LANGUAGES.includes(langParam as TourLang)
    ? langParam
    : "tr") as TourLang;
  const agencyCode = request.nextUrl.searchParams.get("a");

  const supabase = await createServerSupabaseClient();
  const { data: tour, error } = await supabase
    .from("tours")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !tour) {
    return NextResponse.json({ error: "Tur bulunamadı" }, { status: 404 });
  }

  let agencyName: string | null = null;
  let prices = null;
  if (agencyCode) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("agency_code", agencyCode)
      .eq("is_active", true)
      .maybeSingle();

    if (agency) {
      agencyName = agency.name;
      const priceMap = await fetchAgencyTourPriceMap(supabase, agency.id, [
        tour as Tour,
      ]);
      prices = priceMap.get(tour.id) ?? null;
    }
  }

  try {
    const buffer = await generateTourPdfBuffer(
      {
        name: tour.name,
        description: tour.description,
        duration: tour.duration,
        pickup_locations: tour.pickup_locations ?? [],
        images: tour.images ?? [],
        translations: tour.translations,
        tour_managers: tour.tour_managers,
        prices,
        agencyName,
      },
      lang
    );

    const safeName = tour.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
    const filename = `${safeName}-${lang}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Tour PDF generation error:", e);
    return NextResponse.json({ error: "PDF oluşturulamadı" }, { status: 500 });
  }
}
