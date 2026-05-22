/**
 * Tour detail panel — multilingual content (TR, EN, RU, PL)
 */

export const TOUR_LANGUAGES = ["tr", "en", "ru", "pl"] as const;

/** Tur kataloğu PDF — indirilebilir diller */
export const CATALOG_LANGUAGES = ["tr", "en", "ru"] as const;
export type CatalogLang = (typeof CATALOG_LANGUAGES)[number];
export type TourLang = (typeof TOUR_LANGUAGES)[number];

export interface TourTranslationContent {
  name: string;
  description: string;
  highlights: string[];
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
  return { name: "", description: "", highlights: [] };
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
  return { name: legacyName, description: legacyDescription ?? "", highlights: [] };
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

export function buildTourPublicUrl(tourId: string, baseUrl?: string): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  return `${origin.replace(/\/$/, "")}/tour/${tourId}`;
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
  pricesEur: string;
  allTours: string;
  generatedOn: string;
}

export const CATALOG_PAGE_UI: Record<CatalogLang, CatalogUiStrings> = {
  tr: {
    catalogTitle: "Tur Kataloğu",
    tourCatalog: "Easy Book Tours — Tur Kataloğu",
    adultPrice: "Yetişkin",
    childPrice: "Çocuk",
    pricesEur: "Fiyatlar (EUR)",
    allTours: "Tüm Turlar",
    generatedOn: "Oluşturulma",
  },
  en: {
    catalogTitle: "Tour Catalog",
    tourCatalog: "Easy Book Tours — Tour Catalog",
    adultPrice: "Adult",
    childPrice: "Child",
    pricesEur: "Prices (EUR)",
    allTours: "All Tours",
    generatedOn: "Generated",
  },
  ru: {
    catalogTitle: "Каталог туров",
    tourCatalog: "Easy Book Tours — Каталог туров",
    adultPrice: "Взрослый",
    childPrice: "Ребёнок",
    pricesEur: "Цены (EUR)",
    allTours: "Все туры",
    generatedOn: "Дата",
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
