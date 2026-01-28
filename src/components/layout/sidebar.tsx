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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Voucher'lar",
    href: "/dashboard/vouchers",
    icon: FileText,
  },
  {
    name: "Yeni Voucher",
    href: "/dashboard/vouchers/new",
    icon: PlusCircle,
  },
  {
    name: "Raporlar",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    name: "Acenteler",
    href: "/dashboard/agencies",
    icon: Building2,
    adminOnly: true,
  },
  {
    name: "Kullan\u0131c\u0131lar",
    href: "/dashboard/users",
    icon: Users,
    adminOnly: true,
  },
  {
    name: "Ayarlar",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasRole } = useAuth();

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || hasRole("super_admin", "admin")
  );

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-primary">EasyBook</h1>
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
