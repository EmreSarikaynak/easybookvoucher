/**
 * Sitenin canonical URL'i — Twilio mesajları, public katalog QR'ları,
 * sitemap vb. yerlerden çağrılır. Cloudflare/local için NEXT_PUBLIC_APP_URL
 * kullanılır, fallback olarak production domain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://bodrumdayiz.com.tr";

/**
 * Acentenin public katalog URL'sini üretir (örn. https://...com/c/2026003).
 * agency_code geçilmezse null döner.
 */
export function buildAgencyCatalogUrl(
  agencyCode: string | null | undefined
): string | null {
  if (!agencyCode || !agencyCode.trim()) return null;
  return `${SITE_URL}/c/${encodeURIComponent(agencyCode.trim())}`;
}
