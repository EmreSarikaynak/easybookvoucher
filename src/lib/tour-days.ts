const TR_WEEKDAYS: Record<string, string> = {
  monday: "Pazartesi",
  tuesday: "Salı",
  wednesday: "Çarşamba",
  thursday: "Perşembe",
  friday: "Cuma",
  saturday: "Cumartesi",
  sunday: "Pazar",
};

const ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function formatTurkishDays(days: string[] | null | undefined): string {
  if (!days?.length) return "";
  const sorted = ORDER.filter((d) => days.includes(d));
  if (sorted.length === 7) return "Pzt — Paz";
  return sorted.map((d) => TR_WEEKDAYS[d].slice(0, 3)).join(", ");
}

export function formatDepartureTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return raw;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
