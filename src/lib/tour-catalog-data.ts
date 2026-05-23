import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogLang } from "@/lib/tour-i18n";
import type { CatalogPriceInput, CatalogTourInput } from "@/lib/tour-catalog-pdf";

export function resolveCatalogDisplayPrice(
  storedAdult: number | null | undefined,
  storedChild: number | null | undefined,
  baseAdult: number | null | undefined,
  baseChild: number | null | undefined
): { price_adult: number; price_child: number } {
  const adult = storedAdult ?? 0;
  const child = storedChild ?? 0;
  return {
    price_adult: adult > 0 ? Math.round(adult) : Math.round(baseAdult ?? 0),
    price_child: child > 0 ? Math.round(child) : Math.round(baseChild ?? 0),
  };
}

export interface CatalogPdfDataset {
  tours: CatalogTourInput[];
  prices: CatalogPriceInput[];
  agencyName: string;
  tourCount: number;
}

export async function fetchCatalogPdfDataset(
  supabase: SupabaseClient,
  agencyId: string
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

  const { data: priceRows } = await supabase
    .from("agency_tour_prices")
    .select("tour_id, price_adult, price_child")
    .eq("agency_id", agencyId)
    .eq("currency", "EUR");

  const priceByTour = new Map((priceRows ?? []).map((p) => [p.tour_id, p]));

  const prices: CatalogPriceInput[] = tours.map((tour) => ({
    tour_id: tour.id,
    ...resolveCatalogDisplayPrice(
      priceByTour.get(tour.id)?.price_adult,
      priceByTour.get(tour.id)?.price_child,
      tour.base_price_adult_eur,
      tour.base_price_child_eur
    ),
  }));

  return {
    data: {
      agencyName: agency.name,
      tourCount: tours.length,
      tours: tours.map((t) => ({
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
        catalog_background_url: t.catalog_background_url ?? null,
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
