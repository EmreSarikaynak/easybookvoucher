"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/types";
import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { Logo } from "./logo";
import Link from "next/link";

interface HeaderProps {
  onMenuClick: () => void;
  profile: Profile | null;
}

export function Header({ onMenuClick, profile }: HeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    // 1) Client-side signOut: tarayıcının local Supabase state'i ve cookie'leri
    //    temizlenir, onAuthStateChange listener'lar tetiklenir.
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Client signOut hatası:", err);
    }

    // 2) Server-side signOut: SSR cookie'lerini ve server-side session'ı sil.
    //    Hata olsa bile client zaten temizlendi, akışı bloklamayalım.
    try {
      await signOutAction();
    } catch (err) {
      console.error("Server signOut hatası:", err);
    }

    // 3) PWA cache'lerini sıfırla — eski kullanıcının verisi başka birinde
    //    görünmesin (paylaşılan cihaz senaryosu).
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (err) {
        console.error("Cache temizleme hatası:", err);
      }
    }

    // 4) Tam sayfa yenileme ile login'e dön. router.push + refresh bazen
    //    middleware ile yarış koşulu yaratıyor; window.location en sağlamı.
    if (typeof window !== "undefined") {
      window.location.replace("/");
    } else {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm lg:h-16 lg:px-8">
      {/* Sol: Hamburger + Logo (mobil) */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-9 w-9 lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="lg:hidden">
          <Logo className="h-8 w-auto" />
        </Link>
      </div>

      {/* Sağ: Kullanıcı bilgisi ve çıkış */}
      <div className="flex items-center gap-3">
        {profile && (
          <div className="flex items-center gap-2">
            {/* Mobilde sadece avatar, masaüstünde isim de göster */}
            <div className="hidden sm:flex sm:flex-col sm:items-end sm:mr-1">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Çıkış yap"
          className="h-9 w-9"
        >
          {signingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
