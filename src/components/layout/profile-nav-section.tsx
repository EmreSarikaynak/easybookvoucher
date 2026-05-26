"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "@/lib/dashboard-nav";

interface ProfileNavSectionProps {
  items: DashboardNavItem[];
  /** Mobil menüde tıklayınca paneli kapatmak için. */
  onItemClick?: () => void;
}

/**
 * "Profilim" — kâr/maliyet gibi hassas sayfaları gizleyen, varsayılan kapalı
 * açılır menü grubu. Müşteri yanında ekranda kazanç bilgisinin görünmemesi için
 * yalnızca kullanıcı bilinçli olarak açtığında içerik gösterilir.
 */
export function ProfileNavSection({ items, onItemClick }: ProfileNavSectionProps) {
  const pathname = usePathname();
  const isItemActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  // Aktif bir alt sayfadaysak grup açık başlasın; aksi halde kapalı.
  const [open, setOpen] = useState(() => items.some((i) => isItemActive(i.href)));

  if (items.length === 0) return null;

  return (
    <li className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <UserCircle className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">Profilim</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul role="list" className="mt-1 space-y-1 border-l pl-3 ml-2">
          {items.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
