import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

// Service worker global scope type
declare const self: WorkerGlobalScope & typeof globalThis;

// Custom runtime caching: Supabase storage + other cross-origin URLs
// Use NetworkOnly so failures don't throw no-response errors
const customCaching = [
    // Sayfa navigasyonlarını cache'leme: deploy sonrası eski JS, yeni server action
    // ID'leriyle uyuşmayınca "Server Action was not found" hatası oluşuyordu.
    {
        matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
            sameOrigin && request.mode === "navigate",
        handler: new NetworkOnly(),
    },
    // API cevapları her zaman canlı olmalı.
    {
        matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
            sameOrigin && url.pathname.startsWith("/api/"),
        handler: new NetworkOnly(),
    },
    // Supabase storage images — NetworkFirst, silently fail offline
    {
        matcher: ({ url }: { url: URL }) =>
            url.hostname.endsWith(".supabase.co") &&
            url.pathname.startsWith("/storage/"),
        handler: new NetworkFirst({
            cacheName: "supabase-storage",
            networkTimeoutSeconds: 8,
            plugins: [],
        }),
    },
    // All other cross-origin requests — NetworkOnly (no cache, no error)
    {
        matcher: ({ sameOrigin }: { sameOrigin: boolean }) => !sameOrigin,
        handler: new NetworkOnly(),
    },
    // Deploy sonrası eski CSS/JS önbelleği stil kaybına yol açmasın — her zaman ağdan al
    {
        matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
            sameOrigin && url.pathname.startsWith("/_next/static/"),
        handler: new NetworkOnly(),
    },
    // Google font vb. — defaultCache'in geri kalanı
    ...defaultCache,
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: customCaching,
    fallbacks: {
        entries: [
            {
                url: "/offline",
                matcher({ request }: { request: Request }) {
                    return request.destination === "document";
                },
            },
        ],
    },
});

serwist.addEventListeners();

// Push notification event handler — zil sesli + titreşimli uyarı
self.addEventListener("push", ((event: any) => {
    const data = event.data?.json() ?? {};
    const title = data.title || "EasyBook Bildirim";
    const url = data.url || data.data?.url || "/dashboard";
    const options: NotificationOptions & {
        vibrate?: number[];
        renotify?: boolean;
        sound?: string;
    } = {
        body: data.body || "Yeni bir bildiriminiz var",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { ...(data.data || {}), url },
        tag: data.tag || "default",
        // requireInteraction: kullanıcı kapatana kadar gözüksün
        requireInteraction: data.requireInteraction ?? true,
        // silent:false — sistem varsayılan bildirim sesini çalsın
        silent: false,
        // Android/Chrome'da titreşim deseni (zil benzeri)
        vibrate: [200, 100, 200, 100, 200],
        // Aynı tag'le tekrar gelirse yeni bildirim olarak gözüksün (ses tekrar çalsın)
        renotify: true,
    };

    event.waitUntil(
        (self as any).registration.showNotification(title, options)
    );
}) as EventListener);

// Notification click handler
self.addEventListener("notificationclick", ((event: any) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        (self as any).clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any[]) => {
            // Açık bir tab varsa onu kullan
            for (const client of clientList) {
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            // Yoksa yeni tab aç
            if ((self as any).clients.openWindow) {
                return (self as any).clients.openWindow(urlToOpen);
            }
        })
    );
}) as EventListener);
