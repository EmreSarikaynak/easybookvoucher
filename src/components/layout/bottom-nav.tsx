"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, PlusCircle, BarChart3, Settings, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Ana Sayfa", href: "/dashboard", icon: LayoutDashboard },
  { name: "Biletler", href: "/vouchers", icon: FileText },
  { name: "Yeni", href: "/vouchers/new", icon: PlusCircle, primary: true },
  { name: "Tur M.", href: "/tour-costs", icon: MapPin },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white lg:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          if (item.primary) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-primary">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
