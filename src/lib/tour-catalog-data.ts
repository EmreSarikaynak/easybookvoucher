import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogLang } from "@/lib/tour-i18n";
import type {
  CatalogPdfCurrency,
  CatalogPriceInput,
  CatalogTourInput,
} from "@/lib/tour-catalog-pdf";
import type { Tour } from "@/lib/types";

export function resolveCatalogDisplayPrice(
  storedAdult: number | null | undefined,
  storedChild: number | null | undefined,
  storedInfant: number | null | undefined,
  baseAdult: number | null | undefined,
  baseChild: number | null | undefined
): { price_adult: number; price_child: number; price_infant: number } {
  const adult = storedAdult ?? 0;
  const child = storedChild ?? 0;
  const infant = storedInfant ?? 0;
  return {
    price_adult: adult > 0 ? Math.round(adult) : Math.round(baseAdult ?? 0),
    price_child: child > 0 ? Math.round(child) : Math.round(baseChild ?? 0),
    // Bebek: taban fallback YOK — yalnızca acentenin girdiği değer gösterilir.
    price_infant: infant > 0 ? Math.round(infant) : 0,
  };
}

export interface ResolvedTourPriceSet {
  eur: { adult: number; child: number; infant: number };
  try: { adult: number; child: number; infant: number };
}

type TourPriceBase = Pick<
  Tour,
  | "id"
  | "base_price_adult_eur"
  | "base_price_child_eur"
  | "base_price_adult_try"
  | "base_price_child_try"
  | "infant_pricing_enabled"
>;

/**
 * Verilen turlar için EUR + TRY satış fiyatlarını çözer.
 * - agencyId varsa: agency_tour_prices'tan o acentenin price_adult/price_child değerlerini kullanır.
 * - Yoksa veya satır eksikse: tours.base_price_*_<currency> fallback.
 * - Tek sorgu, in-memory join (N+1 yok).
 */
export async function fetchAgencyTourPriceMap(
  supabase: SupabaseClient,
  agencyId: string | null,
  tours: TourPriceBase[]
): Promise<Map<string, ResolvedTourPriceSet>> {
  const tourIds = tours.map((t) => t.id);
  let rows: Array<{
    tour_id: string;
    currency: string;
    price_adult: number | null;
    price_child: number | null;
    price_infant: number | null;
  }> = [];

  if (agencyId && tourIds.length > 0) {
    const { data } = await supabase
      .from("agency_tour_prices")
      .select("tour_id, currency, price_adult, price_child, price_infant")
      .eq("agency_id", agencyId)
      .in("tour_id", tourIds);
    rows = data ?? [];
  }

  const findRow = (tourId: string, currency: "EUR" | "TRY") =>
    rows.find((r) => r.tour_id === tourId && r.currency === currency);

  const result = new Map<string, ResolvedTourPriceSet>();
  for (const t of tours) {
    const eurRow = findRow(t.id, "EUR");
    const tryRow = findRow(t.id, "TRY");
    const infantOn = t.infant_pricing_enabled ?? false;
    const eur = resolveCatalogDisplayPrice(
      eurRow?.price_adult,
      eurRow?.price_child,
      infantOn ? eurRow?.price_infant : 0,
      t.base_price_adult_eur,
      t.base_price_child_eur
    );
    const tryRes = resolveCatalogDisplayPrice(
      tryRow?.price_adult,
      tryRow?.price_child,
      infantOn ? tryRow?.price_infant : 0,
      t.base_price_adult_try,
      t.base_price_child_try
    );
    result.set(t.id, {
      eur: { adult: eur.price_adult, child: eur.price_child, infant: eur.price_infant },
      try: {
        adult: tryRes.price_adult,
        child: tryRes.price_child,
        infant: tryRes.price_infant,
      },
    });
  }
  return result;
}

export interface CatalogPdfDataset {
  tours: CatalogTourInput[];
  prices: CatalogPriceInput[];
  agencyName: string;
  tourCount: number;
}

export async function fetchCatalogPdfDataset(
  supabase: SupabaseClient,
  agencyId: string,
  currency: CatalogPdfCurrency = "EUR"
): Promise<{ data: CatalogPdfDataset | null; error?: string }> {
  const { data: agency, error: agencyErr } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  if (agencyErr || !agency) {
    return { data: null, error: "Acente bulunamadı" };
  }

  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (toursError) {
    return { data: null, error: toursError.message };
  }

  if (!tours?.length) {
    return { data: null, error: "Aktif tur bulunamadı" };
  }

  // Admin tarafından kaydedilmiş tur sıralaması — varsa onu uygula,
  // atanmamış turlar alfabetik olarak sona eklenir.
  const { data: layoutRows } = await supabase
    .from("catalog_tour_layout")
    .select("tour_id, page_number, slot");
  const layoutMap = new Map<string, { page_number: number; slot: number }>();
  for (const r of layoutRows ?? []) {
    if (r.tour_id && r.page_number != null && (r.slot === 0 || r.slot === 1)) {
      layoutMap.set(r.tour_id, { page_number: r.page_number, slot: r.slot });
    }
  }

  const assigned = tours
    .filter((t) => layoutMap.has(t.id))
    .sort((a, b) => {
      const A = layoutMap.get(a.id)!;
      const B = layoutMap.get(b.id)!;
      return A.page_number - B.page_number || A.slot - B.slot;
    });
  const unassigned = tours
    .filter((t) => !layoutMap.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const orderedTours = [...assigned, ...unassigned];

  const { data: priceRows } = await supabase
    .from("agency_tour_prices")
    .select("tour_id, price_adult, price_child, price_infant")
    .eq("agency_id", agencyId)
    .eq("currency", currency);

  const priceByTour = new Map((priceRows ?? []).map((p) => [p.tour_id, p]));

  const prices: CatalogPriceInput[] = orderedTours.map((tour) => {
    const baseAdult =
      currency === "EUR" ? tour.base_price_adult_eur : tour.base_price_adult_try;
    const baseChild =
      currency === "EUR" ? tour.base_price_child_eur : tour.base_price_child_try;
    const row = priceByTour.get(tour.id);
    return {
      tour_id: tour.id,
      ...resolveCatalogDisplayPrice(
        row?.price_adult,
        row?.price_child,
        tour.infant_pricing_enabled ? row?.price_infant : 0,
        baseAdult,
        baseChild
      ),
    };
  });

  return {
    data: {
      agencyName: agency.name,
      tourCount: orderedTours.length,
      tours: orderedTours.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        duration: t.duration,
        pickup_locations: t.pickup_locations ?? [],
        images: t.images ?? [],
        translations: t.translations,
        tour_managers: t.tour_managers,
        departure_days: t.departure_days ?? [],
        departure_time: t.departure_time ?? null,
        meeting_point: t.meeting_point ?? null,
      })),
      prices,
    },
  };
}

export function buildCatalogWhatsAppBody(
  lang: CatalogLang,
  pdfUrl: string,
  agencyName?: string | null
): string {
  const today = new Date().toLocaleDateString(
    lang === "tr"
      ? "tr-TR"
      : lang === "ru"
        ? "ru-RU"
        : lang === "pl"
          ? "pl-PL"
          : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  if (lang === "en") {
    return (
      `Dear Guest,\n\n` +
      `Welcome to EasyBook Tours Bodrum! Please find our complete tour catalog with current prices (EUR) in the PDF below.\n\n` +
      (agencyName ? `🏢 ${agencyName}\n` : "") +
      `📅 ${today}\n\n` +
      `📄 *Tour Catalog (PDF):*\n${pdfUrl}\n\n` +
      `If you have any questions, please contact us via WhatsApp.\n` +
      `Have a wonderful holiday! 🌊\n\n` +
      `EasyBook Tours`
    );
  }

  if (lang === "ru") {
    return (
      `Уважаемый гость,\n\n` +
      `Добро пожаловать в EasyBook Tours Bodrum! Полный каталог наших туров с актуальными ценами (EUR) — в PDF по ссылке ниже.\n\n` +
      (agencyName ? `🏢 ${agencyName}\n` : "") +
      `📅 ${today}\n\n` +
      `📄 *Каталог туров (PDF):*\n${pdfUrl}\n\n` +
      `По всем вопросам пишите нам в WhatsApp.\n` +
      `Желаем отличного отдыха! 🌊\n\n` +
      `EasyBook Tours`
    );
  }

  if (lang === "pl") {
    return (
      `Szanowny Gościu,\n\n` +
      `Witamy w EasyBook Tours Bodrum! Pełny katalog naszych wycieczek z aktualnymi cenami (EUR) znajdziesz w poniższym pliku PDF.\n\n` +
      (agencyName ? `🏢 ${agencyName}\n` : "") +
      `📅 ${today}\n\n` +
      `📄 *Katalog wycieczek (PDF):*\n${pdfUrl}\n\n` +
      `W razie pytań skontaktuj się z nami przez WhatsApp.\n` +
      `Życzymy wspaniałych wakacji! 🌊\n\n` +
      `EasyBook Tours`
    );
  }

  return (
    `Sayın Misafirimiz,\n\n` +
    `EasyBook Tours Bodrum'a hoş geldiniz! Tüm turlarımız ve güncel fiyatlarımız (EUR) aşağıdaki PDF katalogda yer almaktadır.\n\n` +
    (agencyName ? `🏢 ${agencyName}\n` : "") +
    `📅 ${today}\n\n` +
    `📄 *Tur Kataloğu (PDF):*\n${pdfUrl}\n\n` +
    `Sorularınız için bize WhatsApp üzerinden ulaşabilirsiniz.\n` +
    `İyi tatiller dileriz! 🌊\n\n` +
    `EasyBook Tours`
  );
}
