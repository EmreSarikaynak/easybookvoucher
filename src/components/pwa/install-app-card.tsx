"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Share,
  Plus,
  Smartphone,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Copy,
  PlusSquare,
  Bookmark,
  Square,
} from "lucide-react";
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

// Vurgulanan ikonun etrafına teal halka koyar.
function Ring({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md p-0.5 ring-2 ring-teal-500 ring-offset-1">
      {children}
    </span>
  );
}

// Adım 1 görseli: Paylaş düğmesi hem üst hem alt çubukta gösterilir.
function ShareLocationMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mx-auto w-40 overflow-hidden rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
        {/* Üst çubuk */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5">
          <div className="h-3 flex-1 rounded-full bg-gray-200" />
          <Ring>
            <Share className="h-3.5 w-3.5 text-teal-600" />
          </Ring>
        </div>
        {/* Ekran */}
        <div className="flex h-14 items-center justify-center">
          <span className="text-[10px] font-semibold text-gray-400">
            Bodrumdayız
          </span>
        </div>
        {/* Alt çubuk */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
          <ChevronLeft className="h-3.5 w-3.5 text-gray-300" />
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <Ring>
            <Share className="h-3.5 w-3.5 text-teal-600" />
          </Ring>
          <BookOpen className="h-3.5 w-3.5 text-gray-300" />
          <Square className="h-3.5 w-3.5 text-gray-300" />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-500">
        Paylaş düğmesi <b className="text-gray-700">altta</b> ya da{" "}
        <b className="text-gray-700">üstte</b> olabilir
      </p>
    </div>
  );
}

// Adım 2 görseli: Paylaş menüsünde "Ana Ekrana Ekle" satırı vurgulanır.
function ShareSheetMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mx-auto w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
          Paylaş
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-400">
          Kopyala <Copy className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center justify-between bg-teal-50 px-3 py-2 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-300">
          Ana Ekrana Ekle <PlusSquare className="h-4 w-4 text-teal-600" />
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-400">
          Yer İşareti Ekle <Bookmark className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}

// Adım 3 görseli: Onay ekranında sağ üstteki "Ekle" butonu vurgulanır.
function AddConfirmMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mx-auto w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <span className="text-[11px] text-gray-400">İptal</span>
          <span className="text-[11px] font-semibold text-gray-700">
            Ana Ekrana Ekle
          </span>
          <span className="rounded-md bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white ring-2 ring-teal-300">
            Ekle
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-[9px] font-bold text-white">
            EB
          </div>
          <span className="text-[11px] text-gray-600">Bodrumdayız</span>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  illustration,
  children,
}: {
  n: number;
  illustration?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
          {n}
        </span>
        <p className="flex flex-wrap items-center gap-1 text-sm leading-relaxed text-gray-700">
          {children}
        </p>
      </div>
      {illustration && <div className="mt-2 pl-9">{illustration}</div>}
    </div>
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
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
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
          <div className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Şu an Safari kullanmıyorsunuz (örn. Chrome veya Instagram/WhatsApp
              içi tarayıcı). Uygulama yalnızca <strong>Safari</strong> ile ana
              ekrana eklenebilir.
            </div>
            <Step n={1}>
              Sayfayı menüden{" "}
              <span className="font-semibold">Safari&apos;de Aç</span> ya da
              adresi Safari&apos;ye kopyalayın.
            </Step>
            <Step n={2} illustration={<ShareLocationMockup />}>
              Safari&apos;de
              <Share className="inline h-4 w-4 text-blue-600" />
              <span className="font-semibold">Paylaş</span> →{" "}
              <span className="font-semibold">Ana Ekrana Ekle</span> yapın.
            </Step>
          </div>
        ) : isIos ? (
          <div className="space-y-4">
            <Step n={1} illustration={<ShareLocationMockup />}>
              Safari&apos;de <b>alt ya da üst</b> çubuktaki
              <Share className="inline h-4 w-4 text-blue-600" />
              <span className="font-semibold">Paylaş</span> simgesine dokunun.
            </Step>
            <Step n={2} illustration={<ShareSheetMockup />}>
              Açılan menüden
              <Plus className="inline h-4 w-4" />
              <span className="font-semibold">Ana Ekrana Ekle</span> seçeneğine
              dokunun.
            </Step>
            <Step n={3} illustration={<AddConfirmMockup />}>
              Sağ üst köşeden <span className="font-semibold">Ekle</span>&apos;ye
              dokunarak yükleyin.
            </Step>
          </div>
        ) : (
          <div className="space-y-4">
            <Step n={1}>
              Sağ üstteki
              <MoreVertical className="inline h-4 w-4" />
              <span className="font-semibold">menü</span> simgesine dokunun.
            </Step>
            <Step n={2}>
              Açılan menüden{" "}
              <span className="font-semibold">Uygulamayı yükle</span> veya{" "}
              <span className="font-semibold">Ana ekrana ekle</span> seçeneğine
              dokunun.
            </Step>
            <Step n={3}>
              Onay penceresinde <span className="font-semibold">Yükle</span>
              &apos;ye dokunun.
            </Step>
          </div>
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
