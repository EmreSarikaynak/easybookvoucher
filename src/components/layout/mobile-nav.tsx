"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, FileText, PlusCircle, BarChart3, Building2, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Voucher'lar", href: "/dashboard/vouchers", icon: FileText },
  { name: "Yeni Voucher", href: "/dashboard/vouchers/new", icon: PlusCircle },
  { name: "Raporlar", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Acenteler", href: "/dashboard/agencies", icon: Building2, adminOnly: true },
  { name: "Kullan\u0131c\u0131lar", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { hasRole } = useAuth();

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || hasRole("super_admin", "admin")
  );

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
          <h1 className="text-xl font-bold text-primary">EasyBook</h1>
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
