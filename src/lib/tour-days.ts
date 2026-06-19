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

/** Date.getDay() -> canonical weekday key. Pazar (Sunday) = 0. */
const WEEKDAY_INDEX: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * Tarihi yerel saat dilimi kaymasi olmadan yyyy-MM-dd string'e cevirir.
 * (Date.toISOString() UTC'ye gectigi icin gece yarisi civarinda gun kaydirabilir.)
 */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Uygunluk kontrolu icin gereken minimum tur alanlari. */
interface TourScheduleFields {
  departure_days?: string[] | null;
  closed_dates?: string[] | null;
  open_dates?: string[] | null;
}

/**
 * Bir turun belirli bir gunde yapilip yapilmadigini doner.
 * Oncelik: closed_dates (kapali kazanir) -> open_dates (ekstra acik)
 *   -> departure_days bos ise her gun (geriye donuk guvenli) -> haftanin gunu.
 * `date` bir Date veya yyyy-MM-dd string olabilir.
 */
export function isTourOpenOn(
  tour: TourScheduleFields,
  date: Date | string
): boolean {
  const key = typeof date === "string" ? date.slice(0, 10) : toLocalDateKey(date);

  if (tour.closed_dates?.includes(key)) return false;
  if (tour.open_dates?.includes(key)) return true;

  const days = tour.departure_days ?? [];
  if (days.length === 0) return true;

  const d = typeof date === "string" ? new Date(`${key}T00:00:00`) : date;
  const weekday = WEEKDAY_INDEX[d.getDay()];
  return days.includes(weekday);
}

/**
 * react-day-picker `disabled` matcher'i: gun kapaliysa (tur yoksa) true doner.
 * `disablePast` true ise bugunden onceki gunler de pasiflenir.
 */
export function getDisabledMatcher(
  tour: TourScheduleFields,
  opts?: { disablePast?: boolean; today?: Date }
): (date: Date) => boolean {
  const todayKey = opts?.today
    ? toLocalDateKey(opts.today)
    : toLocalDateKey(new Date());
  return (date: Date) => {
    if (opts?.disablePast && toLocalDateKey(date) < todayKey) return true;
    return !isTourOpenOn(tour, date);
  };
}
