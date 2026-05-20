"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop" | "other";

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 1500;

function detectPlatform(): Platform {
    if (typeof window === "undefined") return "other";
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS =
        /iphone|ipad|ipod/.test(ua) ||
        // iPadOS 13+ Safari'de Mac gibi görünüyor; touch desteği ile iPad'i ayır
        (ua.includes("mac") && "ontouchend" in document);
    if (isIOS) return "ios";
    if (/android/.test(ua)) return "android";
    if (/mobi|tablet/.test(ua)) return "other";
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
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Date.parse(raw);
    if (Number.isNaN(until)) return false;
    return Date.now() < until;
}

function markDismissed() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + DISMISS_DAYS);
    localStorage.setItem(DISMISS_KEY, expiry.toISOString());
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
    const [showIosSheet, setShowIosSheet] = useState(false);
    const [platform, setPlatform] = useState<Platform>("other");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const p = detectPlatform();
        setPlatform(p);

        if (isStandalone()) return;
        if (isDismissedRecently()) return;
        // Sadece mobil cihazlarda göster (kullanıcı isteği)
        if (p !== "ios" && p !== "android") return;

        if (p === "ios") {
            const t = setTimeout(() => setShowIosSheet(true), SHOW_DELAY_MS);
            return () => clearTimeout(t);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowAndroidPrompt(true);
        };

        const installedHandler = () => {
            setShowAndroidPrompt(false);
            setShowIosSheet(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", installedHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowAndroidPrompt(false);
            setDeferredPrompt(null);
        } else {
            markDismissed();
            setShowAndroidPrompt(false);
        }
    };

    const handleDismissAndroid = () => {
        markDismissed();
        setShowAndroidPrompt(false);
    };

    const handleDismissIos = () => {
        markDismissed();
        setShowIosSheet(false);
    };

    if (showAndroidPrompt && platform === "android" && deferredPrompt) {
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
                            onClick={handleDismissAndroid}
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

    if (showIosSheet && platform === "ios") {
        return (
            <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4">
                <div className="w-full max-w-sm bg-white border border-gray-200 shadow-2xl rounded-2xl p-5 animate-slide-up relative">
                    <button
                        onClick={handleDismissIos}
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
                        <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                1
                            </span>
                            <span className="flex items-center gap-1 flex-wrap">
                                Safari'de alttaki
                                <Share className="inline h-4 w-4 text-blue-600" />
                                <span className="font-semibold">Paylaş</span>
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
                                <span className="font-semibold">Ekle</span>'ye
                                dokunarak yükleyin.
                            </span>
                        </li>
                    </ol>
                    <Button
                        onClick={handleDismissIos}
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
