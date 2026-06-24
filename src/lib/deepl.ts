/**
 * DeepL Free API istemcisi.
 *
 * Setup:
 *   1) https://www.deepl.com/pro-api adresinden Free planı aç (kredi kartı doğrulaması ister, ücret çekmez).
 *   2) API anahtarını al, .env.local'a ekle:  DEEPL_API_KEY=xxxxxxxx:fx
 *   3) Free anahtar ":fx" ile biter; Pro biter ":xx" veya UUID.
 *
 * Limit: Free planda aylık 500.000 karakter.
 */

const FREE_HOST = "https://api-free.deepl.com";
const PRO_HOST = "https://api.deepl.com";

export type DeepLLang = "TR" | "EN" | "RU" | "PL";

/** TourLang → DeepL kodu */
export function toDeepLLang(lang: string): DeepLLang | null {
  const u = lang.toUpperCase();
  if (u === "TR" || u === "RU" || u === "PL") return u;
  if (u === "EN") return "EN"; // DeepL EN-US/EN-GB ayırır; target için EN-US ya da plain EN — biz EN gönderiyoruz, default US
  return null;
}

interface DeepLResponse {
  translations: { detected_source_language: string; text: string }[];
}

/**
 * Bir veya daha fazla metni tek API çağrısında çevirir (DeepL 50 text/req destekler).
 * Boş veya whitespace-only string'ler çevirilmez, olduğu gibi döner.
 */
export async function translateBatch(
  texts: string[],
  target: DeepLLang,
  source?: DeepLLang | null
): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) throw new Error("DEEPL_API_KEY tanımlı değil");

  const host = key.endsWith(":fx") ? FREE_HOST : PRO_HOST;

  // Boş indexleri sakla — sadece dolu olanları çeviriye gönder.
  const payload: { idx: number; text: string }[] = [];
  texts.forEach((t, i) => {
    if (typeof t === "string" && t.trim().length > 0) {
      payload.push({ idx: i, text: t });
    }
  });

  if (payload.length === 0) return [...texts];

  // DeepL API: text parametresi çoklu form-encoded; biz JSON kullanıyoruz (v2 destekler).
  const body: Record<string, unknown> = {
    text: payload.map((p) => p.text),
    target_lang: target,
    preserve_formatting: true,
    formality: "default",
  };
  if (source) body.source_lang = source;

  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepL ${res.status}: ${errText || res.statusText}`);
  }

  const data = (await res.json()) as DeepLResponse;

  const out = [...texts];
  payload.forEach((p, i) => {
    out[p.idx] = data.translations[i]?.text ?? p.text;
  });
  return out;
}

export interface TourBundle {
  name?: string;
  description?: string;
  highlights?: string[];
  details?: string[];
  included?: string[];
  excluded?: string[];
}

/**
 * Bir tur içeriğini tek dilden hedef dile çevirir.
 * Boş alanlar boş döner.
 */
export async function translateTourBundle(
  src: TourBundle,
  targetLang: string,
  sourceLang: string = "tr"
): Promise<TourBundle> {
  const target = toDeepLLang(targetLang);
  const source = toDeepLLang(sourceLang);
  if (!target) throw new Error(`Desteklenmeyen hedef dil: ${targetLang}`);

  // Tüm metinleri tek liste yap → tek API çağrısı
  const name = src.name ?? "";
  const description = src.description ?? "";
  const highlights = src.highlights ?? [];
  const details = src.details ?? [];
  const included = src.included ?? [];
  const excluded = src.excluded ?? [];

  const flat = [name, description, ...highlights, ...details, ...included, ...excluded];

  const translated = await translateBatch(flat, target, source);

  let cursor = 0;
  const tName = translated[cursor++];
  const tDescription = translated[cursor++];
  const tHighlights = translated.slice(cursor, cursor + highlights.length);
  cursor += highlights.length;
  const tDetails = translated.slice(cursor, cursor + details.length);
  cursor += details.length;
  const tIncluded = translated.slice(cursor, cursor + included.length);
  cursor += included.length;
  const tExcluded = translated.slice(cursor, cursor + excluded.length);

  return {
    name: tName,
    description: tDescription,
    highlights: tHighlights,
    details: tDetails,
    included: tIncluded,
    excluded: tExcluded,
  };
}
