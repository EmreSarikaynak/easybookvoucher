"use client";

import { useState, useEffect } from "react";
import { Download, Share, Plus, Smartphone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [iosNeedsSafari, setIosNeedsSafari] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setGuideOpen(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Android / masaüstünde tarayıcı native yükleme olayını verdiyse doğrudan kur.
  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      // Native olay yoksa elle yönergeleri göster.
      setGuideOpen(true);
      return;
    }
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
    } catch {
      /* prompt çağrılamadı, yönergeleri göster */
      setGuideOpen(true);
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
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

  // Native yükleme olayı varsa (Android/masaüstü Chrome-Edge) tek tıkla kurar,
  // aksi halde (özellikle iOS) yönerge modali açan tek bir buton gösteririz.
  const canNativeInstall = !!deferredPrompt;

  return (
    <>
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
          {canNativeInstall ? (
            <Button onClick={handleNativeInstall} disabled={installing}>
              <Download className="mr-2 h-4 w-4" />
              {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
            </Button>
          ) : (
            <Button onClick={() => setGuideOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              {platform === "ios" ? "Ana Ekrana Ekle" : "Nasıl Yüklenir?"}
            </Button>
          )}
        </CardContent>
      </Card>

      <InstallGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        platform={platform}
        iosNeedsSafari={iosNeedsSafari}
      />
    </>
  );
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span className="flex items-center gap-1 flex-wrap leading-relaxed">
        {children}
      </span>
    </li>
  );
}

function InstallGuideDialog({
  open,
  onOpenChange,
  platform,
  iosNeedsSafari,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  platform: Platform;
  iosNeedsSafari: boolean;
}) {
  const isIos = platform === "ios";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-teal-600" />
            {isIos && iosNeedsSafari ? "Önce Safari'de Açın" : "Ana Ekrana Ekle"}
          </DialogTitle>
          <DialogDescription>
            EasyBook&apos;u cihazınıza uygulama olarak ekleyin.
          </DialogDescription>
        </DialogHeader>

        {isIos && iosNeedsSafari ? (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
              Şu an Safari kullanmıyorsunuz (örn. Chrome veya Instagram/WhatsApp
              içi tarayıcı). Uygulama yalnızca <strong>Safari</strong> ile ana
              ekrana eklenebilir.
            </div>
            <ol className="space-y-3">
              <StepRow n={1}>
                Sayfayı menüden{" "}
                <span className="font-semibold">Safari&apos;de Aç</span> ya da
                adresi Safari&apos;ye kopyalayın.
              </StepRow>
              <StepRow n={2}>
                Safari&apos;de alttaki
                <Share className="inline h-4 w-4 text-blue-600" />
                <span className="font-semibold">Paylaş</span> →{" "}
                <span className="font-semibold">Ana Ekrana Ekle</span> yapın.
              </StepRow>
            </ol>
          </div>
        ) : isIos ? (
          <ol className="space-y-3 text-sm text-gray-700">
            <StepRow n={1}>
              Safari&apos;de alttaki
              <Share className="inline h-4 w-4 text-blue-600" />
              <span className="font-semibold">Paylaş</span> simgesine dokunun.
            </StepRow>
            <StepRow n={2}>
              Açılan menüden
              <Plus className="inline h-4 w-4" />
              <span className="font-semibold">Ana Ekrana Ekle</span> seçeneğine
              dokunun.
            </StepRow>
            <StepRow n={3}>
              Sağ üst köşeden <span className="font-semibold">Ekle</span>&apos;ye
              dokunarak yükleyin.
            </StepRow>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm text-gray-700">
            <StepRow n={1}>
              Sağ üstteki
              <MoreVertical className="inline h-4 w-4" />
              <span className="font-semibold">menü</span> simgesine dokunun.
            </StepRow>
            <StepRow n={2}>
              Açılan menüden{" "}
              <span className="font-semibold">Uygulamayı yükle</span> veya{" "}
              <span className="font-semibold">Ana ekrana ekle</span> seçeneğine
              dokunun.
            </StepRow>
            <StepRow n={3}>
              Onay penceresinde <span className="font-semibold">Yükle</span>
              &apos;ye dokunun.
            </StepRow>
          </ol>
        )}

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          Anladım
        </Button>
      </DialogContent>
    </Dialog>
  );
}
