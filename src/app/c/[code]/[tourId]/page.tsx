import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { fetchAgencyTourPriceMap } from "@/lib/tour-catalog-data";
import { PublicBookingForm } from "@/components/public-catalog/public-booking-form";
import type { Tour } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ code: string; tourId: string }>;
}

export default async function PublicTourDetailPage({ params }: PageProps) {
  const { code, tourId } = await params;
  const agencyCode = decodeURIComponent(code).trim();

  const supabase = createServiceRoleClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, agency_code, is_active, public_catalog_enabled")
    .eq("agency_code", agencyCode)
    .maybeSingle();

  if (!agency || !agency.is_active || agency.public_catalog_enabled === false) {
    notFound();
  }

  const { data: tour } = await supabase
    .from("tours")
    .select(
      "id, name, description, duration, images, pickup_locations, departure_time, meeting_point, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try, is_active"
    )
    .eq("id", tourId)
    .maybeSingle();

  if (!tour || !tour.is_active) {
    notFound();
  }

  const tourTyped = tour as Pick<
    Tour,
    | "id"
    | "name"
    | "description"
    | "duration"
    | "images"
    | "pickup_locations"
    | "departure_time"
    | "meeting_point"
    | "base_price_adult_eur"
    | "base_price_child_eur"
    | "base_price_adult_try"
    | "base_price_child_try"
  >;

  const priceMap = await fetchAgencyTourPriceMap(supabase, agency.id, [tourTyped]);
  const price = priceMap.get(tourTyped.id);
  const adultEur = price?.eur.adult ?? 0;
  const childEur = price?.eur.child ?? 0;

  const cover = tourTyped.images?.[0] ?? null;
  const pickupLocations = (tourTyped.pickup_locations ?? []) as string[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/c/${encodeURIComponent(agencyCode)}`}
            className="text-blue-700 text-sm font-medium hover:underline"
          >
            ← Tüm turlar
          </Link>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
            Ref: {agency.agency_code}
          </span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-sm">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={tourTyped.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-300 text-7xl">
              🚢
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {tourTyped.name}
          </h1>
          {tourTyped.duration && (
            <p className="text-sm text-gray-500 mt-1">⏱ {tourTyped.duration}</p>
          )}
        </div>

        {tourTyped.description && (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {tourTyped.description}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3 bg-white border rounded-xl p-4 shadow-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Yetişkin / Adult
            </p>
            <p className="text-2xl font-bold text-blue-700">
              {adultEur > 0 ? `€${adultEur}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Çocuk / Child
            </p>
            <p className="text-2xl font-bold text-gray-700">
              {childEur > 0 ? `€${childEur}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Bebek / Infant
            </p>
            <p className="text-2xl font-bold text-gray-500">€0</p>
          </div>
        </div>

        <PublicBookingForm
          agencyCode={agency.agency_code}
          tourId={tourTyped.id}
          tourName={tourTyped.name}
          adultPriceEur={adultEur}
          childPriceEur={childEur}
          pickupOptions={pickupLocations}
        />
      </article>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        <p>EasyBook Tours Bodrum &middot; Online Rezervasyon</p>
      </footer>
    </main>
  );
}
