"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { Logo } from "./logo";
import { filterDashboardNav } from "@/lib/dashboard-nav";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export function MobileNav({ open, onClose, profile }: MobileNavProps) {
  const pathname = usePathname();
  const filteredNav = filterDashboardNav(profile);

  if (!open) return null;

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo className="h-10 w-auto" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex flex-col px-6 pb-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <ul role="list" className="flex flex-col gap-y-1">
            {filteredNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
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
