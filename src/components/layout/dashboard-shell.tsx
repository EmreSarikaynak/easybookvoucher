"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NotificationPrompt } from "@/components/pwa/notification-prompt";
import { PushSubscriptionSync } from "@/components/pwa/push-subscription-sync";
import type { Profile } from "@/lib/types";

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile | null;
}

export function DashboardShell({ children, profile }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar profile={profile} />
      <MobileNav 
        open={mobileNavOpen} 
        onClose={() => setMobileNavOpen(false)} 
        profile={profile}
      />

      <div className="lg:pl-64">
        <Header 
          onMenuClick={() => setMobileNavOpen(true)} 
          profile={profile}
        />
        <main className="p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobil Alt Navigasyon */}
      <BottomNav />

      {/* Bildirim İzin Banner'ı */}
      <NotificationPrompt />

      {/* İzin verilmişse subscription'ı 24 saatte bir sessizce yenile */}
      <PushSubscriptionSync />
    </div>
  );
}
