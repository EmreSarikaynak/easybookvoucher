"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NotificationPrompt } from "@/components/pwa/notification-prompt";
import { PushSubscriptionSync } from "@/components/pwa/push-subscription-sync";
import { SecestaFooter } from "@/components/layout/secesta-footer";
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
        <main className="p-4 pb-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="flex-1 pb-20 lg:pb-0">{children}</div>
          <SecestaFooter
            variant="compact"
            className="mt-8 mb-16 lg:mb-0 -mx-4 sm:-mx-6 lg:-mx-8 rounded-none"
          />
        </main>
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
