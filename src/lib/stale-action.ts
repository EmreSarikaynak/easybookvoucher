/**
 * Yeni deploy sonrası tarayıcıda kalan eski Next.js bundle, yeni sunucudaki
 * Server Action ID'lerini bilmediği için "UnrecognizedActionError" /
 * "Server Action ... was not found" hatası verir. Bu durumda service worker'ı
 * temizleyip sayfayı yeniden yüklemek gerekir.
 */

const STALE_ACTION_HINTS = [
  "UnrecognizedActionError",
  "Server Action",
  "was not found on the server",
  "Failed to find Server Action",
];

export function isStaleServerActionError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return STALE_ACTION_HINTS.some((h) => msg.includes(h));
}

let recovering = false;

/** Service worker cache'lerini temizle ve sayfayı yenile. Tek seferlik tetiklenir. */
export async function recoverFromStaleDeploy(): Promise<void> {
  if (recovering || typeof window === "undefined") return;
  recovering = true;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    // Sessiz fallback — yine de reload deneriz.
  }
  window.location.reload();
}
