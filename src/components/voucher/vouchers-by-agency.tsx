"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, FileText, Users } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import type { Voucher } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VouchersByAgencyProps {
  vouchers: Voucher[];
  searchTerm?: string;
}

interface AgencyGroup {
  id: string;
  name: string;
  code: string | null;
  vouchers: Voucher[];
  activeCount: number;
  cancelledCount: number;
  completedCount: number;
}

const UNASSIGNED_KEY = "__unassigned__";

export function VouchersByAgency({ vouchers, searchTerm }: VouchersByAgencyProps) {
  const filtered = searchTerm
    ? vouchers.filter((v) => {
        const q = searchTerm.toLowerCase();
        return (
          v.customer_name?.toLowerCase().includes(q) ||
          v.voucher_no?.toLowerCase().includes(q) ||
          v.tour?.name?.toLowerCase().includes(q)
        );
      })
    : vouchers;

  const groups = useMemo<AgencyGroup[]>(() => {
    const map = new Map<string, AgencyGroup>();

    for (const v of filtered) {
      const key = v.agency?.id ?? UNASSIGNED_KEY;
      let group = map.get(key);
      if (!group) {
        group = {
          id: key,
          name: v.agency?.name ?? "Acente Atanmamış",
          code: v.agency?.agency_code ?? null,
          vouchers: [],
          activeCount: 0,
          cancelledCount: 0,
          completedCount: 0,
        };
        map.set(key, group);
      }
      group.vouchers.push(v);
      if (v.status === "active") group.activeCount += 1;
      else if (v.status === "cancelled") group.cancelledCount += 1;
      else if (v.status === "completed") group.completedCount += 1;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.id === UNASSIGNED_KEY) return 1;
      if (b.id === UNASSIGNED_KEY) return -1;
      return b.vouchers.length - a.vouchers.length;
    });
  }, [filtered]);

  const [openId, setOpenId] = useState<string | null>(
    groups.length === 1 ? groups[0].id : null
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Bilet bulunamadı</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Henüz hiç bilet eklenmemiş.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const isOpen = openId === group.id;
        return (
          <div
            key={group.id}
            className={cn(
              "rounded-lg border bg-card overflow-hidden",
              isOpen && "col-span-full"
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : group.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors",
                "hover:bg-muted/50 active:bg-muted touch-manipulation",
                isOpen && "bg-muted/30 border-b"
              )}
              aria-expanded={isOpen}
            >
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-sm sm:text-base truncate">
                    {group.name}
                  </h3>
                  {group.code && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0">
                      {group.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.vouchers.length} bilet
                  </span>
                  {group.activeCount > 0 && (
                    <span className="text-green-600 dark:text-green-500">
                      {group.activeCount} aktif
                    </span>
                  )}
                  {group.cancelledCount > 0 && (
                    <span className="text-red-600 dark:text-red-500">
                      {group.cancelledCount} iptal
                    </span>
                  )}
                  {group.completedCount > 0 && (
                    <span>{group.completedCount} tamamlandı</span>
                  )}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {isOpen && (
              <div className="p-3 sm:p-4 bg-muted/10">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.vouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
