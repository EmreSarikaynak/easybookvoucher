/** JSONB settings.value alanından WhatsApp telefon numarasını okur. */
export function parseWhatsappPhoneSetting(value: unknown): string | null {
  if (value == null) return null;
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : "";
  const trimmed = raw.trim();
  return trimmed || null;
}
