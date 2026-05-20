import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { TourCostsEditor } from "@/components/tour/tour-costs-editor";
import { TourCostsPdfActions } from "@/components/tour/tour-costs-pdf-actions";
import type { Tour } from "@/lib/types";

interface TourRow {
  tour: Tour;
  cost_adult_eur: number;
  cost_child_eur: number;
  cost_adult_try: number;
  cost_child_try: number;
  isCustom: boolean;
}

async function getTourCosts(agencyId: string | null): Promise<TourRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (toursError || !tours) {
    console.error("Tours fetch error:", toursError);
    return [];
  }

  // Per-agency cost overrides (only when agency user)
  let overrides: Array<{
    tour_id: string;
    currency: string;
    cost_adult: number | null;
    cost_child: number | null;
  }> = [];

  if (agencyId) {
    const { data } = await supabase
      .from("agency_tour_prices")
      .select("tour_id, currency, cost_adult, cost_child")
      .eq("agency_id", agencyId);
    overrides = data ?? [];
  }

  const findOverride = (tourId: string, currency: "EUR" | "TRY") =>
    overrides.find((o) => o.tour_id === tourId && o.currency === currency);

  return tours.map((tour) => {
    const eur = findOverride(tour.id, "EUR");
    const tryRow = findOverride(tour.id, "TRY");
    const hasEurOverride = eur?.cost_adult != null || eur?.cost_child != null;
    const hasTryOverride = tryRow?.cost_adult != null || tryRow?.cost_child != null;

    return {
      tour,
      cost_adult_eur: eur?.cost_adult ?? tour.base_price_adult_eur ?? 0,
      cost_child_eur: eur?.cost_child ?? tour.base_price_child_eur ?? 0,
      cost_adult_try: tryRow?.cost_adult ?? tour.base_price_adult_try ?? 0,
      cost_child_try: tryRow?.cost_child ?? tour.base_price_child_try ?? 0,
      isCustom: hasEurOverride || hasTryOverride,
    };
  });
}

async function getActiveTours(): Promise<Tour[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export default async function TourCostsPage() {
  const profile = await getCurrentUser();
  const admin = isAdmin(profile);
  const agencyId = !admin && profile?.agency_id ? profile.agency_id : null;

  if (admin) {
    const tours = await getActiveTours();
    const adminPdfRows = tours.map((t) => ({
      tourName: t.name,
      costAdultEur: Math.round(t.base_price_adult_eur ?? 0),
      costChildEur: Math.round(t.base_price_child_eur ?? 0),
      costAdultTry: Math.round(t.base_price_adult_try ?? 0),
      costChildTry: Math.round(t.base_price_child_try ?? 0),
      isCustom: false,
    }));
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tur Maliyetleri</h1>
            <p className="text-muted-foreground text-sm mt-1">
              EasyBook tur standart taban fiyatları. Buradan girdiğiniz değerler acente
              düzenle ekranında varsayılan olarak görünür.
            </p>
          </div>
          <TourCostsPdfActions rows={adminPdfRows} agencyName="EasyBook Tours" />
        </div>
        <TourCostsEditor tours={tours} />
      </div>
    );
  }

  const rows = await getTourCosts(agencyId);
  const agencyPhone = profile?.agency?.phone ?? null;
  const agencyName = profile?.agency?.name ?? null;
  const pdfRows = rows.map(
    ({ tour, cost_adult_eur, cost_child_eur, cost_adult_try, cost_child_try, isCustom }) => ({
      tourName: tour.name,
      costAdultEur: cost_adult_eur,
      costChildEur: cost_child_eur,
      costAdultTry: cost_adult_try,
      costChildTry: cost_child_try,
      isCustom,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tur Maliyetleri</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Size özel tanımlanmış tur maliyetleri. Özel fiyat yoksa varsayılan maliyet gösterilir.
          </p>
        </div>
        <TourCostsPdfActions
          rows={pdfRows}
          agencyName={agencyName}
          agencyPhone={agencyPhone}
        />
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Tur Adı</th>
                <th className="text-right py-3 px-4 font-semibold">EUR Fiyat (Yet/Çoc)</th>
                <th className="text-right py-3 px-4 font-semibold">TL Fiyat (Yet/Çoc)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    Henüz aktif tur bulunmuyor
                  </td>
                </tr>
              ) : (
                rows.map(({ tour, cost_adult_eur, cost_child_eur, cost_adult_try, cost_child_try, isCustom }) => (
                  <tr key={tour.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {tour.name}
                        {agencyId && isCustom && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            Size özel
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                      <div className="flex flex-col gap-1 items-end">
                        <span>{Math.round(cost_adult_eur)} € <span className="text-[10px] text-muted-foreground font-sans font-normal">(Yet)</span></span>
                        <span className="text-blue-500/80">{Math.round(cost_child_eur)} € <span className="text-[10px] text-muted-foreground font-sans font-normal">(Çoc)</span></span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      <div className="flex flex-col gap-1 items-end">
                        <span>{Math.round(cost_adult_try)} ₺ <span className="text-[10px] font-sans font-normal">(Yet)</span></span>
                        <span className="text-muted-foreground/60">{Math.round(cost_child_try)} ₺ <span className="text-[10px] font-sans font-normal">(Çoc)</span></span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Henüz aktif tur bulunmuyor
            </div>
          ) : (
            rows.map(({ tour, cost_adult_eur, cost_child_eur, cost_adult_try, cost_child_try, isCustom }) => (
              <div key={tour.id} className="p-4 space-y-2">
                <div className="font-medium text-sm flex items-center gap-2">
                  {tour.name}
                  {agencyId && isCustom && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                      Size özel
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EUR (Yet/Çoc)</span>
                  <div className="flex items-center gap-2 font-mono font-semibold text-blue-700">
                    <span>{Math.round(cost_adult_eur)} €</span>
                    <span className="text-muted-foreground font-sans font-normal text-xs">/</span>
                    <span className="text-blue-500/80">{Math.round(cost_child_eur)} €</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TL (Yet/Çoc)</span>
                  <div className="flex items-center gap-2 font-mono text-muted-foreground">
                    <span>{Math.round(cost_adult_try)} ₺</span>
                    <span className="font-sans font-normal text-xs">/</span>
                    <span className="text-muted-foreground/60">{Math.round(cost_child_try)} ₺</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
