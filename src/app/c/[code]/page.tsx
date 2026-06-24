import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { fetchAgencyTourPriceMap } from "@/lib/tour-catalog-data";
import type { Tour } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function PublicCatalogPage({ params }: PageProps) {
  const { code } = await params;
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

  const { data: tours } = await supabase
    .from("tours")
    .select(
      "id, name, description, duration, images, departure_time, meeting_point, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try, infant_pricing_enabled"
    )
    .eq("is_active", true)
    .order("name");

  const toursList = (tours ?? []) as Array<
    Pick<
      Tour,
      | "id"
      | "name"
      | "description"
      | "duration"
      | "images"
      | "departure_time"
      | "meeting_point"
      | "base_price_adult_eur"
      | "base_price_child_eur"
      | "base_price_adult_try"
      | "base_price_child_try"
      | "infant_pricing_enabled"
    >
  >;

  const priceMap = await fetchAgencyTourPriceMap(supabase, agency.id, toursList);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">
              EasyBook Tours Bodrum
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Bodrum&apos;un en güzel turları, online rezervasyon
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
            Ref: {agency.agency_code}
          </span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-5">Turlarımız</h2>

        {toursList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border">
            <p className="text-gray-500">Şu anda yayında tur bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {toursList.map((tour) => {
              const price = priceMap.get(tour.id);
              const adultEur = price?.eur.adult ?? 0;
              const childEur = price?.eur.child ?? 0;
              const infantEur = price?.eur.infant ?? 0;
              const cover = tour.images?.[0] ?? null;
              return (
                <Link
                  key={tour.id}
                  href={`/c/${encodeURIComponent(agencyCode)}/${tour.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-300 transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={tour.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-400 text-5xl">
                        🚢
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-700">
                      {tour.name}
                    </h3>
                    {tour.duration && (
                      <p className="text-xs text-gray-500">⏱ {tour.duration}</p>
                    )}
                    <div className="pt-2 border-t flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Yetişkin / Adult
                        </p>
                        <p className="text-lg font-bold text-blue-700">
                          {adultEur > 0 ? `€${adultEur}` : "—"}
                        </p>
                      </div>
                      {childEur > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Çocuk / Child
                          </p>
                          <p className="text-base font-semibold text-gray-700">
                            €{childEur}
                          </p>
                        </div>
                      )}
                    </div>
                    {infantEur > 0 && (
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-gray-400 uppercase tracking-wide">
                          Bebek / Infant
                        </span>
                        <span className="font-semibold text-gray-600">€{infantEur}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <span className="inline-block w-full text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-md group-hover:bg-blue-700 transition">
                        Rezervasyon Yap →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        <p>EasyBook Tours Bodrum &middot; Online Rezervasyon</p>
      </footer>
    </main>
  );
}
