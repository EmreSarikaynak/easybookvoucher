"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, FileText, PlusCircle, BarChart3, Building2, Users, Settings, MapPin, DollarSign, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Profile, UserRole } from "@/lib/types";
import { Logo } from "./logo";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Biletler", href: "/vouchers", icon: FileText },
  { name: "Yeni Bilet", href: "/vouchers/new", icon: PlusCircle },
  { name: "Raporlar", href: "/reports", icon: BarChart3 },
  { name: "Turlar", href: "/tours", icon: MapPin, adminOnly: true },
  { name: "Tur Maliyetleri", href: "/tour-costs", icon: DollarSign },
  { name: "Acenteler", href: "/agencies", icon: Building2, adminOnly: true },
  { name: "Kullanıcılar", href: "/users", icon: Users, adminOnly: true },
  { name: "Destek Talepleri", href: "/support", icon: Headphones },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export function MobileNav({ open, onClose, profile }: MobileNavProps) {
  const pathname = usePathname();

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isAdmin = hasRole("super_admin", "admin");
  const canViewToursNav =
    isAdmin ||
    (hasRole("agency_admin", "sales") && !!profile?.agency_id);

  const filteredNav = navigation.filter((item) => {
    if (item.href === "/tours") return canViewToursNav;
    return !item.adminOnly || isAdmin;
  });

  if (!open) return null;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo className="h-10 w-auto" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex flex-col px-6">
          <ul role="list" className="flex flex-col gap-y-1">
            {filteredNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
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
    </Fragment>
  );
}
