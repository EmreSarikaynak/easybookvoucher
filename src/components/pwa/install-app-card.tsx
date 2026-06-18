"use client";

import { useState, useEffect } from "react";
import { Download, Share, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Platform = "android" | "ios" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  if (window.matchMedia("(display-mode: standalone)").matches) return "other";
  return "desktop";
}

// iOS'ta "Ana Ekrana Ekle" YALNIZCA Safari'de çalışır. Chrome (CriOS), Firefox
// (FxiOS) veya uygulama içi tarayıcılarda (Instagram, WhatsApp, Facebook...)
// seçenek görünmez; bu durumda önce "Safari'de açın" uyarısı vermeliyiz.
function isRealIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua)) return false;
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|WhatsApp|GSA\//i.test(ua))
    return false;
  return /Safari/i.test(ua) && /Version\//i.test(ua);
}

export function InstallAppCard() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installing, setInstalling] = useState(false);
  const [iosNeedsSafari, setIosNeedsSafari] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === "ios") setIosNeedsSafari(!isRealIOSSafari());
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    const promptEvent = deferredPrompt as BeforeInstallPromptEvent;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  if (isInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Uygulama Yüklü
          </CardTitle>
          <CardDescription>
            EasyBook uygulaması cihazınıza yüklenmiş durumda.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Uygulamayı Yükle
        </CardTitle>
        <CardDescription>
          Daha hızlı erişim için EasyBook&apos;u cihazınıza uygulama olarak
          ekleyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {platform === "android" && deferredPrompt ? (
          <Button onClick={handleInstall} disabled={installing}>
            <Download className="mr-2 h-4 w-4" />
            {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
          </Button>
        ) : platform === "ios" ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            {iosNeedsSafari && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">Önce Safari&apos;de açın</p>
                <p className="mt-1">
                  Şu an Safari kullanmıyorsunuz (örn. Chrome veya
                  Instagram/WhatsApp içi tarayıcı). Uygulama yalnızca{" "}
                  <strong>Safari</strong> ile ana ekrana eklenebilir. Bu sayfayı
                  Safari&apos;de açıp aşağıdaki adımları izleyin.
                </p>
              </div>
            )}
            <p className="font-medium text-foreground">
              iOS&apos;a Eklemek İçin:
            </p>
            <ol className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <span>
                  Safari&apos;de alt çubuktaki{" "}
                  <strong>Paylaş (□↑)</strong> butonuna dokunun
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Plus className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <span>
                  <strong>&#34;Ana Ekrana Ekle&#34;</strong> seçeneğine dokunun
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <span>
                  Sağ üst köşedeki <strong>&#34;Ekle&#34;</strong> butonuna dokunun
                </span>
              </li>
            </ol>
          </div>
        ) : platform === "desktop" ? (
          <div className="space-y-3">
            {deferredPrompt ? (
              <Button onClick={handleInstall} disabled={installing}>
                <Download className="mr-2 h-4 w-4" />
                {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tarayıcı adres çubuğundaki yükleme simgesini kullanarak
                uygulamayı masaüstünüze ekleyebilirsiniz.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bu tarayıcıda otomatik yükleme desteklenmiyor. Tarayıcı
            menüsünden &quot;Ana Ekrana Ekle&quot; seçeneğini deneyin.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
