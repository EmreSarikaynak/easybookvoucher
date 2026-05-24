import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { TourCostsEditor } from "@/components/tour/tour-costs-editor";
import { TourCostsPdfActions } from "@/components/tour/tour-costs-pdf-actions";
import {
  AgencyPricesEditor,
  type AgencyPriceRow,
} from "@/components/tour/agency-prices-editor";
import type { Tour } from "@/lib/types";

interface TourRow {
  tour: Tour;
  cost_adult_eur: number;
  cost_child_eur: number;
  cost_adult_try: number;
  cost_child_try: number;
  sale_adult_eur: number;
  sale_child_eur: number;
  sale_adult_try: number;
  sale_child_try: number;
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

  // Per-agency cost overrides + saved sale prices (only when agency user)
  let rows: Array<{
    tour_id: string;
    currency: string;
    cost_adult: number | null;
    cost_child: number | null;
    price_adult: number | null;
    price_child: number | null;
  }> = [];

  if (agencyId) {
    const { data } = await supabase
      .from("agency_tour_prices")
      .select("tour_id, currency, cost_adult, cost_child, price_adult, price_child")
      .eq("agency_id", agencyId);
    rows = data ?? [];
  }

  const findRow = (tourId: string, currency: "EUR" | "TRY") =>
    rows.find((o) => o.tour_id === tourId && o.currency === currency);

  return tours.map((tour) => {
    const eur = findRow(tour.id, "EUR");
    const tryRow = findRow(tour.id, "TRY");
    const hasEurOverride = eur?.cost_adult != null || eur?.cost_child != null;
    const hasTryOverride = tryRow?.cost_adult != null || tryRow?.cost_child != null;

    return {
      tour,
      cost_adult_eur: eur?.cost_adult ?? tour.base_price_adult_eur ?? 0,
      cost_child_eur: eur?.cost_child ?? tour.base_price_child_eur ?? 0,
      cost_adult_try: tryRow?.cost_adult ?? tour.base_price_adult_try ?? 0,
      cost_child_try: tryRow?.cost_child ?? tour.base_price_child_try ?? 0,
      sale_adult_eur: Number(eur?.price_adult) || 0,
      sale_child_eur: Number(eur?.price_child) || 0,
      sale_adult_try: Number(tryRow?.price_adult) || 0,
      sale_child_try: Number(tryRow?.price_child) || 0,
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
  // PDF satırları: acente PDF'ine kendi satış fiyatları gider (admin fiyatı değil)
  const pdfRows = rows.map(
    ({ tour, sale_adult_eur, sale_child_eur, sale_adult_try, sale_child_try, isCustom }) => ({
      tourName: tour.name,
      costAdultEur: Math.round(sale_adult_eur),
      costChildEur: Math.round(sale_child_eur),
      costAdultTry: Math.round(sale_adult_try),
      costChildTry: Math.round(sale_child_try),
      isCustom,
    })
  );

  // İTur editörü: satış alanı boşsa yönetici fiyatını varsayılan olarak göster.
  // Bu varsayılan ekranda görünür ama kayıt yapmadan geçerli olmaz.
  const editorRows: AgencyPriceRow[] = rows.map((r) => ({
    tour_id: r.tour.id,
    tour_name: r.tour.name,
    departure_days: r.tour.departure_days ?? null,
    departure_time: r.tour.departure_time ?? null,
    cost_adult_eur: Math.round(r.cost_adult_eur),
    cost_child_eur: Math.round(r.cost_child_eur),
    cost_adult_try: Math.round(r.cost_adult_try),
    cost_child_try: Math.round(r.cost_child_try),
    // Satış girilmemişse yönetici fiyatını varsayılan göster (kaydetmeden geçerli değil)
    sale_adult_eur: Math.round(r.sale_adult_eur || r.cost_adult_eur),
    sale_child_eur: Math.round(r.sale_child_eur || r.cost_child_eur),
    sale_adult_try: Math.round(r.sale_adult_try || r.cost_adult_try),
    sale_child_try: Math.round(r.sale_child_try || r.cost_child_try),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">iTur Fiyat</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Satış fiyatlarınızı belirleyin. Kaydettiğiniz fiyatlar Tur Kataloğu,
            katalog PDF'i ve yeni bilet oluştururken otomatik kullanılır.
          </p>
        </div>
        <TourCostsPdfActions
          rows={pdfRows}
          agencyName={agencyName}
          agencyPhone={agencyPhone}
        />
      </div>

      <AgencyPricesEditor rows={editorRows} />
    </div>
  );
}
