"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Kullanıcı daha once dismiss etmişse gösterme
            const dismissed = localStorage.getItem("pwa-install-dismissed");
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // 7 gün boyunca gösterme
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        localStorage.setItem("pwa-install-dismissed", expiryDate.toISOString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 shadow-lg rounded-lg p-4 flex items-center gap-3 z-50 sm:left-auto sm:right-4 sm:w-96 animate-slide-up">
            <div className="flex-shrink-0 w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">Uygulamayı Yükle</p>
                <p className="text-xs text-gray-600 mt-0.5">
                    Daha hızlı erişim için cihazınıza yükleyin
                </p>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleInstall} size="sm" className="bg-teal-600 hover:bg-teal-700">
                    Yükle
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
