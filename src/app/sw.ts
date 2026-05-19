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
    // Spread the default cache rules for same-origin
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

// Push notification event handler
self.addEventListener("push", ((event: any) => {
    const data = event.data?.json() ?? {};
    const title = data.title || "EasyBook Bildirim";
    const options: NotificationOptions = {
        body: data.body || "Yeni bir bildiriminiz var",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: data.data || {},
        tag: data.tag || "default",
        requireInteraction: data.requireInteraction || false,
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
