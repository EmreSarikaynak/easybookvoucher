import { normalizeStoredPhone } from "@/lib/phone";

/** JSONB settings.value alanından WhatsApp telefon numarasını okur (tek). */
export function parseWhatsappPhoneSetting(value: unknown): string | null {
  return parseWhatsappPhonesSetting(value)[0] ?? null;
}

/**
 * JSONB settings.value alanından bir veya birden çok WhatsApp numarasını okur.
 * Desteklenen biçimler:
 *  - dizi: ["+905...","+905..."]
 *  - virgül/satır/noktalı virgülle ayrılmış string: "+905..., 0532..."
 *  - tek string veya number
 * Her numara E.164'e normalize edilir; tekrarlananlar elenir.
 */
export function parseWhatsappPhonesSetting(value: unknown): string[] {
  const raw: string[] = [];

  if (Array.isArray(value)) {
    for (const v of value) {
      if (v != null) raw.push(String(v));
    }
  } else if (typeof value === "string") {
    raw.push(...value.split(/[,\n;]+/));
  } else if (typeof value === "number") {
    raw.push(String(value));
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    // Geçerli bir numaraya normalize edilebiliyorsa onu, aksi halde ham metni kullan.
    const normalized = normalizeStoredPhone(trimmed) ?? trimmed;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
