"use client";

import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/constants";
import { MenuIcon, UserCircleIcon, LogoutIcon } from "@/components/ui/icons";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile, role, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Hamburger menu (mobile only) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Menüyü aç"
        >
          <MenuIcon />
        </button>

        {/* Center spacer for mobile */}
        <div className="lg:hidden flex-1" />

        {/* Left spacer for desktop */}
        <div className="hidden lg:block flex-1" />

        {/* Right: User info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">
              {profile?.full_name || "Kullanıcı"}
            </p>
            <p className="text-xs text-gray-500">
              {role ? ROLE_LABELS[role] : ""}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-easybook-orange-100 flex items-center justify-center">
              {profile ? (
                <span className="text-sm font-semibold text-easybook-orange-600">
                  {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              ) : (
                <UserCircleIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Çıkış Yap"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
