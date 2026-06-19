/**
 * Tour detail panel — multilingual content (TR, EN, RU, PL)
 */

export const TOUR_LANGUAGES = ["tr", "en", "ru", "pl"] as const;

/** Tur kataloğu PDF — indirilebilir diller */
export const CATALOG_LANGUAGES = ["tr", "en", "ru", "pl"] as const;
export type CatalogLang = (typeof CATALOG_LANGUAGES)[number];
export type TourLang = (typeof TOUR_LANGUAGES)[number];

export interface TourTranslationContent {
  name: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  details: string[];
}

export type TourTranslations = Partial<Record<TourLang, TourTranslationContent>>;

export const TOUR_LANG_LABELS: Record<TourLang, string> = {
  tr: "Türkçe",
  en: "English",
  ru: "Русский",
  pl: "Polski",
};

export const TOUR_LANG_FLAGS: Record<TourLang, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  ru: "🇷🇺",
  pl: "🇵🇱",
};

export function emptyTourTranslation(): TourTranslationContent {
  return {
    name: "",
    description: "",
    highlights: [],
    included: [],
    excluded: [],
    details: [],
  };
}

export function emptyTourTranslations(): TourTranslations {
  return {
    tr: emptyTourTranslation(),
    en: emptyTourTranslation(),
    ru: emptyTourTranslation(),
    pl: emptyTourTranslation(),
  };
}

/** Merge DB JSON with legacy name/description on tours row */
export function normalizeTourTranslations(
  translations: TourTranslations | null | undefined,
  legacyName: string,
  legacyDescription: string | null
): TourTranslations {
  const base = emptyTourTranslations();
  const fromDb = translations ?? {};

  for (const lang of TOUR_LANGUAGES) {
    const t = fromDb[lang];
    base[lang] = {
      name: t?.name ?? (lang === "tr" ? legacyName : ""),
      description: t?.description ?? (lang === "tr" ? legacyDescription ?? "" : ""),
      highlights: t?.highlights ?? [],
      included: t?.included ?? [],
      excluded: t?.excluded ?? [],
      details: t?.details ?? [],
    };
  }
  return base;
}

export function getTourContentForLang(
  translations: TourTranslations | null | undefined,
  lang: TourLang,
  legacyName: string,
  legacyDescription: string | null
): TourTranslationContent {
  const normalized = normalizeTourTranslations(translations, legacyName, legacyDescription);
  const content = normalized[lang];
  if (content?.name?.trim()) return content;
  for (const fallback of TOUR_LANGUAGES) {
    const c = normalized[fallback];
    if (c?.name?.trim()) return c;
  }
  return {
    name: legacyName,
    description: legacyDescription ?? "",
    highlights: [],
    included: [],
    excluded: [],
    details: [],
  };
}

export function primaryTranslationName(translations: TourTranslations): string {
  return (
    translations.tr?.name?.trim() ||
    translations.en?.name?.trim() ||
    translations.ru?.name?.trim() ||
    translations.pl?.name?.trim() ||
    ""
  );
}

export function buildTourPublicUrl(
  tourId: string,
  baseUrl?: string,
  agencyCode?: string | null
): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  const path = `${origin.replace(/\/$/, "")}/tour/${tourId}`;
  if (!agencyCode) return path;
  return `${path}?a=${encodeURIComponent(agencyCode)}`;
}

export function addAgencyCodeToUrl(
  url: string,
  agencyCode?: string | null
): string {
  if (!agencyCode) return url;

  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const parsed = new URL(
      url,
      isAbsolute
        ? undefined
        : typeof window !== "undefined"
          ? window.location.origin
          : "https://easybook.local"
    );
    parsed.searchParams.set("a", agencyCode);
    return isAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}a=${encodeURIComponent(agencyCode)}`;
  }
}

export function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

/** Public tour page UI strings */
export interface TourPageUiStrings {
  downloadPdf: string;
  photoGallery: string;
  videos: string;
  highlights: string;
  duration: string;
  pickupLocations: string;
  tourManagers: string;
  contact: string;
  since: string;
  noDescription: string;
  selectLanguage: string;
}

export const TOUR_PAGE_UI: Record<TourLang, TourPageUiStrings> = {
  tr: {
    downloadPdf: "PDF İndir",
    photoGallery: "Fotoğraf Galerisi",
    videos: "Videolar",
    highlights: "Tur Programı",
    duration: "Süre",
    pickupLocations: "Alış Noktaları",
    tourManagers: "Tur Sorumluları",
    contact: "İletişim",
    since: "Easy Book Tours — 1999'dan beri",
    noDescription: "Açıklama henüz eklenmedi.",
    selectLanguage: "Dil",
  },
  en: {
    downloadPdf: "Download PDF",
    photoGallery: "Photo Gallery",
    videos: "Videos",
    highlights: "Tour Highlights",
    duration: "Duration",
    pickupLocations: "Pickup Locations",
    tourManagers: "Tour Managers",
    contact: "Contact",
    since: "Easy Book Tours — Since 1999",
    noDescription: "Description not available yet.",
    selectLanguage: "Language",
  },
  ru: {
    downloadPdf: "Скачать PDF",
    photoGallery: "Фотогалерея",
    videos: "Видео",
    highlights: "Программа тура",
    duration: "Длительность",
    pickupLocations: "Места посадки",
    tourManagers: "Менеджеры тура",
    contact: "Контакты",
    since: "Easy Book Tours — с 1999 года",
    noDescription: "Описание пока не добавлено.",
    selectLanguage: "Язык",
  },
  pl: {
    downloadPdf: "Pobierz PDF",
    photoGallery: "Galeria zdjęć",
    videos: "Filmy",
    highlights: "Program wycieczki",
    duration: "Czas trwania",
    pickupLocations: "Miejsca odbioru",
    tourManagers: "Kierownicy wycieczki",
    contact: "Kontakt",
    since: "Easy Book Tours — od 1999 roku",
    noDescription: "Opis nie został jeszcze dodany.",
    selectLanguage: "Język",
  },
};

export function getTourPageUi(lang: TourLang): TourPageUiStrings {
  return TOUR_PAGE_UI[lang] ?? TOUR_PAGE_UI.tr;
}

export interface CatalogUiStrings {
  catalogTitle: string;
  tourCatalog: string;
  adultPrice: string;
  childPrice: string;
  infantPrice: string;
  pricesEur: string;
  allTours: string;
  generatedOn: string;
  /** Yeni katalog şablonu (Faz 3) */
  tableOfContents: string;
  contactPage: string;
  duration: string;
  departure: string;
  departureDays: string;
  departureTime: string;
  meetingPoint: string;
  included: string;
  excluded: string;
  highlights: string;
  tourDetails: string;
  priceOnRequest: string;
  page: string;
  pageOf: (a: number, b: number) => string;
  toursCountSuffix: (n: number) => string;
  weekdays: Record<
    "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
    string
  >;
}

export const CATALOG_PAGE_UI: Record<CatalogLang, CatalogUiStrings> = {
  tr: {
    catalogTitle: "Tur Kataloğu 2026",
    tourCatalog: "Tur Kataloğu 2026",
    adultPrice: "Yetişkin",
    childPrice: "Çocuk",
    infantPrice: "Bebek",
    pricesEur: "Fiyatlar (EUR)",
    allTours: "Tüm Turlar",
    generatedOn: "Oluşturulma",
    tableOfContents: "İçindekiler",
    contactPage: "İletişim",
    duration: "Süre",
    departure: "Kalkış",
    departureDays: "Kalkış Günleri",
    departureTime: "Kalkış Saati",
    meetingPoint: "Buluşma Noktası",
    included: "Dahil Olanlar",
    excluded: "Dahil Olmayanlar",
    highlights: "Tur Programı",
    tourDetails: "Tur Detayları",
    priceOnRequest: "Fiyat: Talep üzerine",
    page: "Sayfa",
    pageOf: (a, b) => `Sayfa ${a} / ${b}`,
    toursCountSuffix: (n) => `${n} tur`,
    weekdays: {
      monday: "Pazartesi",
      tuesday: "Salı",
      wednesday: "Çarşamba",
      thursday: "Perşembe",
      friday: "Cuma",
      saturday: "Cumartesi",
      sunday: "Pazar",
    },
  },
  en: {
    catalogTitle: "Tour Catalog 2026",
    tourCatalog: "Tour Catalog 2026",
    adultPrice: "Adult",
    childPrice: "Child",
    infantPrice: "Infant",
    pricesEur: "Prices (EUR)",
    allTours: "All Tours",
    generatedOn: "Generated",
    tableOfContents: "Contents",
    contactPage: "Contact",
    duration: "Duration",
    departure: "Departure",
    departureDays: "Departure Days",
    departureTime: "Departure Time",
    meetingPoint: "Meeting Point",
    included: "Included",
    excluded: "Not Included",
    highlights: "Tour Highlights",
    tourDetails: "Tour Details",
    priceOnRequest: "Price on request",
    page: "Page",
    pageOf: (a, b) => `Page ${a} / ${b}`,
    toursCountSuffix: (n) => `${n} tours`,
    weekdays: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
  },
  ru: {
    catalogTitle: "Каталог туров 2026",
    tourCatalog: "Каталог туров 2026",
    adultPrice: "Взрослый",
    childPrice: "Ребёнок",
    infantPrice: "Младенец",
    pricesEur: "Цены (EUR)",
    allTours: "Все туры",
    generatedOn: "Дата",
    tableOfContents: "Содержание",
    contactPage: "Контакты",
    duration: "Длительность",
    departure: "Отправление",
    departureDays: "Дни отправления",
    departureTime: "Время отправления",
    meetingPoint: "Место встречи",
    included: "Включено",
    excluded: "Не включено",
    highlights: "Программа тура",
    tourDetails: "Подробности тура",
    priceOnRequest: "Цена по запросу",
    page: "Страница",
    pageOf: (a, b) => `Страница ${a} / ${b}`,
    toursCountSuffix: (n) => `${n} туров`,
    weekdays: {
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
    },
  },
  pl: {
    catalogTitle: "Katalog Wycieczek 2026",
    tourCatalog: "Katalog Wycieczek 2026",
    adultPrice: "Dorosły",
    childPrice: "Dziecko",
    infantPrice: "Niemowlę",
    pricesEur: "Ceny (EUR)",
    allTours: "Wszystkie wycieczki",
    generatedOn: "Wygenerowano",
    tableOfContents: "Spis treści",
    contactPage: "Kontakt",
    duration: "Czas trwania",
    departure: "Wyjazd",
    departureDays: "Dni wyjazdu",
    departureTime: "Godzina wyjazdu",
    meetingPoint: "Miejsce zbiórki",
    included: "W cenie",
    excluded: "Nie w cenie",
    highlights: "Program wycieczki",
    tourDetails: "Szczegóły wycieczki",
    priceOnRequest: "Cena na zapytanie",
    page: "Strona",
    pageOf: (a, b) => `Strona ${a} / ${b}`,
    toursCountSuffix: (n) => `${n} wycieczek`,
    weekdays: {
      monday: "Poniedziałek",
      tuesday: "Wtorek",
      wednesday: "Środa",
      thursday: "Czwartek",
      friday: "Piątek",
      saturday: "Sobota",
      sunday: "Niedziela",
    },
  },
};

export function getCatalogPageUi(lang: CatalogLang): CatalogUiStrings {
  return CATALOG_PAGE_UI[lang] ?? CATALOG_PAGE_UI.tr;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    const shorts = u.pathname.match(/\/shorts\/([^/]+)/);
    if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
  } catch {
    return null;
  }
  return null;
}
