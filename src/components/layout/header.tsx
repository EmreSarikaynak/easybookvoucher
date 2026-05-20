"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/types";
import { signOutAction } from "@/app/actions/auth";
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
    setSigningOut(true);
    try {
      const result = await signOutAction();
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        console.error("Çıkış hatası:", result.error);
        setSigningOut(false);
      }
    } catch (error) {
      console.error("Çıkış hatası:", error);
      setSigningOut(false);
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
