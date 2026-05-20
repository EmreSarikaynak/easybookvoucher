"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Building2,
  Users,
  Settings,
  MapPin,
  Anchor,
  Calendar,
  Ship,
  DollarSign,
  MessageSquare,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types";
import { Logo } from "./logo";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Biletler",
    href: "/vouchers",
    icon: FileText,
  },
  {
    name: "Yeni Bilet",
    href: "/vouchers/new",
    icon: PlusCircle,
  },
  {
    name: "Raporlar",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Turlar",
    href: "/tours",
    icon: MapPin,
    adminOnly: true,
  },
  {
    name: "Filo Yönetimi",
    href: "/fleet",
    icon: Anchor,
    adminOnly: true,
  },
  {
    name: "Operasyon Takvimi",
    href: "/operations",
    icon: Calendar,
    adminOnly: true,
  },
  {
    name: "Tekne Kiralamaları",
    href: "/bookings",
    icon: Ship,
  },
  {
    name: "Tur Maliyetleri",
    href: "/tour-costs",
    icon: DollarSign,
  },
  {
    name: "Acenteler",
    href: "/agencies",
    icon: Building2,
    adminOnly: true,
  },
  {
    name: "Kullanıcılar",
    href: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    name: "WhatsApp Logları",
    href: "/whatsapp-logs",
    icon: MessageSquare,
    adminOnly: true,
  },
  {
    name: "Destek Talepleri",
    href: "/support",
    icon: Headphones,
  },
  {
    name: "Ayarlar",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isAdmin = hasRole("super_admin", "admin");

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Logo className="h-10 w-auto" />
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {filteredNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
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
        </nav>
      </div>
    </aside>
  );
}
