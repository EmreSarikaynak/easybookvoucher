"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus, X, Smartphone, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other-mobile" | "desktop";

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 800;
const MANUAL_FALLBACK_MS = 2500;

function detectPlatform(): Platform {
    if (typeof window === "undefined") return "desktop";
    const ua = window.navigator.userAgent;
    const maxTouchPoints = window.navigator.maxTouchPoints || 0;

    // iPhone / iPod ve iPad (iPadOS Safari "Macintosh" gönderir, çoklu touch ile ayırırız)
    const isIOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && maxTouchPoints > 1);
    if (isIOS) return "ios";

    if (/Android/i.test(ua)) return "android";

    // Diğer mobile tarayıcılar (HUAWEI, KaiOS, Windows Phone vb.)
    if (/Mobi|Tablet|Mobile/i.test(ua)) return "other-mobile";

    return "desktop";
}

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    const mq = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
        "standalone" in window.navigator &&
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
            true;
    return mq || iosStandalone;
}

function isDismissedRecently(): boolean {
    if (typeof window === "undefined") return true;
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const until = Date.parse(raw);
        if (Number.isNaN(until)) return false;
        return Date.now() < until;
    } catch {
        return false;
    }
}

function markDismissed() {
    try {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + DISMISS_DAYS);
        localStorage.setItem(DISMISS_KEY, expiry.toISOString());
    } catch {
        /* localStorage erişilemez (private mode), yok say */
    }
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showNativePrompt, setShowNativePrompt] = useState(false);
    const [showManualSheet, setShowManualSheet] = useState(false);
    const [platform, setPlatform] = useState<Platform>("desktop");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const p = detectPlatform();
        setPlatform(p);

        if (isStandalone()) return;
        if (isDismissedRecently()) return;
        // Yalnızca mobil cihazlar / tabletlerde göster
        if (p === "desktop") return;

        let nativeFired = false;
        let manualTimer: ReturnType<typeof setTimeout> | null = null;

        const handler = (e: Event) => {
            e.preventDefault();
            nativeFired = true;
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            if (manualTimer) clearTimeout(manualTimer);
            setTimeout(() => setShowNativePrompt(true), SHOW_DELAY_MS);
        };

        const installedHandler = () => {
            setShowNativePrompt(false);
            setShowManualSheet(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", installedHandler);

        // iOS Safari `beforeinstallprompt` tetiklemiyor → manuel sheet hemen aç.
        // Diğer mobil/tabletlerde event biraz gecikebileceği için kısa bekle,
        // gelmezse "Ana Ekrana Ekle" talimatı göster.
        if (p === "ios") {
            manualTimer = setTimeout(
                () => setShowManualSheet(true),
                SHOW_DELAY_MS
            );
        } else {
            manualTimer = setTimeout(() => {
                if (!nativeFired) setShowManualSheet(true);
            }, MANUAL_FALLBACK_MS);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
            if (manualTimer) clearTimeout(manualTimer);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setShowNativePrompt(false);
                setDeferredPrompt(null);
                return;
            }
        } catch {
            /* prompt çağrılamadı */
        }
        markDismissed();
        setShowNativePrompt(false);
    };

    const dismissAll = () => {
        markDismissed();
        setShowNativePrompt(false);
        setShowManualSheet(false);
    };

    if (showNativePrompt && deferredPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:w-96">
                <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                    <div className="flex-shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                        <Download className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                            Uygulamayı Yükle
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Daha hızlı erişim için ana ekranınıza ekleyin.
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={handleInstall}
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            Yükle
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={dismissAll}
                            className="h-8 w-8"
                            aria-label="Kapat"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (showManualSheet) {
        const isIos = platform === "ios";
        return (
            <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4">
                <div className="w-full max-w-sm bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 animate-slide-up relative">
                    <button
                        onClick={dismissAll}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                        aria-label="Kapat"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Smartphone className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-900 leading-tight">
                                Ana Ekrana Ekle
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Bodrumdayız uygulamasını yükleyin
                            </p>
                        </div>
                    </div>
                    <ol className="space-y-2 text-sm text-gray-700 mb-4">
                        {isIos ? (
                            <>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        1
                                    </span>
                                    <span className="flex items-center gap-1 flex-wrap">
                                        Safari'de alttaki
                                        <Share className="inline h-4 w-4 text-blue-600" />
                                        <span className="font-semibold">
                                            Paylaş
                                        </span>
                                        simgesine dokunun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        2
                                    </span>
                                    <span className="flex items-center gap-1 flex-wrap">
                                        Açılan menüden
                                        <Plus className="inline h-4 w-4" />
                                        <span className="font-semibold">
                                            Ana Ekrana Ekle
                                        </span>
                                        seçeneğine dokunun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        3
                                    </span>
                                    <span>
                                        Sağ üst köşeden{" "}
                                        <span className="font-semibold">
                                            Ekle
                                        </span>
                                        'ye dokunarak yükleyin.
                                    </span>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        1
                                    </span>
                                    <span className="flex items-center gap-1 flex-wrap">
                                        Sağ üstteki
                                        <MoreVertical className="inline h-4 w-4" />
                                        <span className="font-semibold">
                                            menü
                                        </span>
                                        simgesine dokunun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        2
                                    </span>
                                    <span>
                                        Açılan menüden{" "}
                                        <span className="font-semibold">
                                            Uygulamayı yükle
                                        </span>{" "}
                                        veya{" "}
                                        <span className="font-semibold">
                                            Ana ekrana ekle
                                        </span>{" "}
                                        seçeneğine dokunun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        3
                                    </span>
                                    <span>
                                        Onay penceresinde{" "}
                                        <span className="font-semibold">
                                            Yükle
                                        </span>
                                        'ye dokunun.
                                    </span>
                                </li>
                            </>
                        )}
                    </ol>
                    <Button
                        onClick={dismissAll}
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        size="sm"
                    >
                        Anladım
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
