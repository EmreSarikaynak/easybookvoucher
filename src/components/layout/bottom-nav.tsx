"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { getBottomNavItems } from "@/lib/dashboard-nav";

interface BottomNavProps {
  profile?: Profile | null;
}

export function BottomNav({ profile = null }: BottomNavProps) {
  const pathname = usePathname();
  const items = getBottomNavItems(profile);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white lg:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isPrimary = item.href === "/vouchers/new";

          if (isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 min-w-[56px]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <span className="mt-0.5 text-[9px] font-medium text-primary truncate max-w-[56px]">
                  Yeni
                </span>
              </Link>
            );
          }

          const shortName =
            item.name.length > 8
                ? item.name.slice(0, 7) + "…"
                : item.name;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-w-[52px] max-w-[72px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              <span className="text-[9px] font-medium text-center leading-tight">
                {shortName}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
