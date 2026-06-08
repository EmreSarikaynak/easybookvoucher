/**
 * Tur kataloğu PDF için lucide tabanlı ikon seti + anahtar kelime eşleyici.
 *
 * Her ikon 24×24 viewBox, stroke-currentColor format.
 * React-PDF <Svg><Path/></Svg> ile render edilir.
 *
 * Eşleyici: bir dahil/dahil-değil metnine bakar, TR/EN/RU keyword listesinden
 * eşleşen ilk ikonu döndürür. Hiçbir şey eşleşmezse default (check/x) döner.
 */

export interface IconShape {
  /** Bir veya birden çok SVG <path d=...> verisi. fill="none" stroke ile çizilir. */
  paths: string[];
  /** Opsiyonel SVG element listesi (circle, rect, polyline gibi).
   *  type: 'circle'|'rect'|'polyline'  + ilgili attr. */
  shapes?: Array<
    | { kind: "circle"; cx: number; cy: number; r: number }
    | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
    | { kind: "polyline"; points: string }
    | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  >;
}

export const ICONS: Record<string, IconShape> = {
  check: {
    paths: [],
    shapes: [{ kind: "polyline", points: "20 6 9 17 4 12" }],
  },
  x: {
    paths: ["M18 6 6 18", "m6 6 12 12"],
    shapes: [],
  },
  bus: {
    paths: [
      "M8 6v6",
      "M15 6v6",
      "M2 12h19.6",
      "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3",
      "M9 18h5",
    ],
    shapes: [
      { kind: "circle", cx: 7, cy: 18, r: 2 },
      { kind: "circle", cx: 16, cy: 18, r: 2 },
    ],
  },
  ticket: {
    paths: [
      "M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
      "M13 5v2",
      "M13 17v2",
      "M13 11v2",
    ],
  },
  utensils: {
    paths: [
      "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",
      "M7 2v20",
      "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
    ],
  },
  cupSoda: {
    paths: [
      "m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8",
      "M5 8h14",
      "M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0",
      "m12 8 1-6h2",
    ],
  },
  lock: {
    paths: ["M7 11V7a5 5 0 0 1 10 0v4"],
    shapes: [
      { kind: "rect", x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 },
    ],
  },
  user: {
    paths: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"],
    shapes: [{ kind: "circle", cx: 12, cy: 7, r: 4 }],
  },
  hotel: {
    paths: [
      "M10 22v-6.57",
      "M12 11h.01",
      "M12 7h.01",
      "M14 15.43V22",
      "M15 16a5 5 0 0 0-6 0",
      "M16 11h.01",
      "M16 7h.01",
      "M8 11h.01",
      "M8 7h.01",
    ],
    shapes: [{ kind: "rect", x: 4, y: 2, width: 16, height: 20, rx: 2 }],
  },
  waves: {
    paths: [
      "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
    ],
  },
  umbrella: {
    paths: [
      "M22 12a10.06 10.06 0 0 0-20 0Z",
      "M12 12v8a2 2 0 0 0 4 0",
      "M12 2v1",
    ],
  },
  ship: {
    paths: [
      "M12 10.189V14",
      "M12 2v3",
      "M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6",
      "M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76",
      "M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
    ],
  },
  camera: {
    paths: [
      "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
    ],
    shapes: [{ kind: "circle", cx: 12, cy: 13, r: 3 }],
  },
  shieldCheck: {
    paths: [
      "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      "m9 12 2 2 4-4",
    ],
  },
  wifi: {
    paths: [
      "M5 13a10 10 0 0 1 14 0",
      "M8.5 16.5a5 5 0 0 1 7 0",
      "M2 8.82a15 15 0 0 1 20 0",
      "M12 20h.01",
    ],
  },
  map: {
    paths: [
      "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894L8.106 3.447a2 2 0 0 1 1.788 0z",
      "M15 5.764v15",
      "M9 3.236v15",
    ],
  },
  sunMedium: {
    paths: [
      "M12 3v1",
      "M12 20v1",
      "M3 12h1",
      "M20 12h1",
      "m18.364 5.636-.707.707",
      "m6.343 17.657-.707.707",
      "m5.636 5.636.707.707",
      "m17.657 17.657.707.707",
    ],
    shapes: [{ kind: "circle", cx: 12, cy: 12, r: 4 }],
  },
  clock: {
    paths: ["M12 6v6l4 2"],
    shapes: [{ kind: "circle", cx: 12, cy: 12, r: 10 }],
  },
  mapPin: {
    paths: ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"],
    shapes: [{ kind: "circle", cx: 12, cy: 10, r: 3 }],
  },
  calendar: {
    paths: ["M8 2v4", "M16 2v4", "M3 10h18"],
    shapes: [
      { kind: "rect", x: 3, y: 4, width: 18, height: 18, rx: 2 },
    ],
  },
  phone: {
    paths: [
      "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    ],
  },
  globe: {
    paths: [
      "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
      "M2 12h20",
    ],
    shapes: [{ kind: "circle", cx: 12, cy: 12, r: 10 }],
  },
  // Kaptan / yacht crew → çıpa
  anchor: {
    paths: ["M12 22V8", "M5 12H2a10 10 0 0 0 20 0h-3"],
    shapes: [{ kind: "circle", cx: 12, cy: 5, r: 3 }],
  },
  // Aşçı / şef → şef şapkası
  chefHat: {
    paths: [
      "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",
      "M6 17h12",
    ],
  },
  // Yakıt / fuel → pompa
  fuel: {
    paths: [
      "M3 22h12",
      "M5 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18",
      "M9 13h2",
      "M15 9h2a2 2 0 0 1 2 2v6.5a1.5 1.5 0 0 1-3 0V14h-1",
    ],
  },
  // Can yeleği / can simidi → life buoy
  lifeBuoy: {
    paths: [
      "m4.93 4.93 4.24 4.24",
      "m14.83 9.17 4.24-4.24",
      "m14.83 14.83 4.24 4.24",
      "m9.17 14.83-4.24 4.24",
    ],
    shapes: [
      { kind: "circle", cx: 12, cy: 12, r: 10 },
      { kind: "circle", cx: 12, cy: 12, r: 4 },
    ],
  },
  // Müzik → nota
  music: {
    paths: ["M9 18V5l12-2v13"],
    shapes: [
      { kind: "circle", cx: 6, cy: 18, r: 3 },
      { kind: "circle", cx: 18, cy: 16, r: 3 },
    ],
  },
  // Çay / kahve → fincan
  coffee: {
    paths: [
      "M10 2v2",
      "M14 2v2",
      "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
    ],
  },
};

export type IconKey =
  | "check" | "x" | "bus" | "ticket" | "utensils" | "cupSoda" | "lock" | "user"
  | "hotel" | "waves" | "umbrella" | "ship" | "camera" | "shieldCheck" | "wifi"
  | "map" | "sunMedium" | "clock" | "mapPin" | "calendar" | "phone" | "globe"
  | "anchor" | "chefHat" | "fuel" | "lifeBuoy" | "music" | "coffee";

interface KeywordRule {
  icon: IconKey;
  // Lowercase keywords across TR / EN / RU. Substring match.
  words: string[];
}

const RULES: KeywordRule[] = [
  {
    // Kaptan TR / captain EN / капитан RU — utensils'in "öğle" gibi yaygın
    // partial match'i ile çakışmaması için RULES'un en başında.
    icon: "anchor",
    words: [
      "kaptan", "captain", "skipper", "denizci", "капитан", "шкипер",
    ],
  },
  {
    icon: "chefHat",
    words: [
      "aşçı", "asci", "ahçı", "ahci", "şef", "sef",
      "chef", "cook", "cooking",
      "повар", "шеф",
    ],
  },
  {
    icon: "fuel",
    words: [
      "yakıt", "yakit", "mazot", "benzin",
      "fuel", "petrol", "gas", "gasoline", "diesel",
      "топливо", "бензин", "дизель",
    ],
  },
  {
    icon: "lifeBuoy",
    words: [
      "can yeleği", "can yelegi", "can simidi", "kurtarma",
      "life jacket", "life vest", "life buoy", "lifejacket", "lifebuoy", "lifesaver",
      "спасательн",
    ],
  },
  {
    icon: "music",
    words: [
      "müzik", "muzik", "şarkı", "sarki", "ses sistemi",
      "music", "audio", "sound system", "dj",
      "музык",
    ],
  },
  {
    icon: "coffee",
    words: [
      "çay", "cay", "kahve", "türk kahvesi", "turk kahvesi",
      "coffee", "tea", "espresso",
      "чай", "кофе",
    ],
  },
  {
    icon: "bus",
    words: [
      "transfer", "ulaşım", "ulasim", "araç", "shuttle", "minibus",
      "transport", "трансфер", "перевозка", "транспорт", "shuttle",
    ],
  },
  {
    icon: "ticket",
    words: [
      "bilet", "giriş", "giris", "entrance", "ticket", "admission",
      "вход", "билет",
    ],
  },
  {
    icon: "utensils",
    words: [
      "yemek", "öğle", "ogle", "akşam", "aksam", "kahvaltı", "kahvalti",
      "açık büfe", "acik bufe", "yiyecek", "öğün", "ogun",
      "lunch", "dinner", "breakfast", "meal", "food", "buffet",
      "обед", "ужин", "завтрак", "питание", "еда", "перекус",
    ],
  },
  {
    icon: "cupSoda",
    words: [
      "içecek", "icecek", "alkolsüz", "alkolsuz", "su", "meşrubat", "mesrubat",
      "drink", "beverage", "soft drink",
      "напиток", "напитки", "вода",
    ],
  },
  {
    icon: "lock",
    words: ["dolap", "locker", "soyunma", "değişme", "degisme", "wardrobe", "шкафчик", "сейф"],
  },
  {
    icon: "user",
    words: ["rehber", "guide", "tur lideri", "lider", "гид", "экскурсовод"],
  },
  {
    icon: "hotel",
    words: ["otel", "hotel", "konaklama", "accommodation", "отель", "проживание"],
  },
  {
    icon: "waves",
    words: ["havuz", "pool", "su", "swim", "yüzme", "yuzme", "бассейн", "купание"],
  },
  {
    icon: "umbrella",
    words: ["plaj", "beach", "şezlong", "sezlong", "sunbed", "umbrella", "пляж", "шезлонг", "зонт"],
  },
  {
    icon: "ship",
    words: ["tekne", "boat", "yat", "yacht", "gemi", "лодка", "яхта", "корабль"],
  },
  {
    icon: "camera",
    words: ["fotoğraf", "fotograf", "foto", "photo", "photograph", "фото"],
  },
  {
    icon: "shieldCheck",
    words: [
      "sigorta", "insurance", "güvenlik", "guvenlik", "safety", "secure",
      "страхов", "безопасност",
    ],
  },
  {
    icon: "wifi",
    words: ["wifi", "wi-fi", "internet", "интернет"],
  },
  {
    icon: "map",
    words: ["harita", "map", "tur planı", "tur plani", "itiner", "карта", "маршрут"],
  },
  {
    icon: "sunMedium",
    words: ["snorkel", "dalış", "dalis", "diving", "şnorkel", "snorkeling", "снорклинг", "дайвинг"],
  },
];

/**
 * Verilen metne uygun ikon anahtarını döndürür.
 * Hiçbir keyword eşleşmezse fallback ikon döner.
 */
export function pickIconForText(text: string, fallback: IconKey = "check"): IconKey {
  const t = (text ?? "").toLowerCase().normalize("NFC");
  if (!t.trim()) return fallback;
  for (const rule of RULES) {
    for (const word of rule.words) {
      if (t.includes(word)) return rule.icon;
    }
  }
  return fallback;
}
