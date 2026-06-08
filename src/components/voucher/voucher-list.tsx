"use client";

import { FileText } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import type { Voucher, UserRole } from "@/lib/types";

interface VoucherListProps {
  vouchers: Voucher[];
  loading?: boolean;
  userRole?: UserRole;
  searchTerm?: string;
}

export function VoucherList({ vouchers, loading, userRole, searchTerm }: VoucherListProps) {
  // Server müşteri adı + bilet no'yu filtreledi; tur adını client-side ekliyoruz.
  // searchTerm varsa üç alandan birinde eşleşen göster.
  const displayed = searchTerm
    ? vouchers.filter((v) => {
        const q = searchTerm.toLowerCase();
        return (
          v.customer_name?.toLowerCase().includes(q) ||
          v.voucher_no?.toLowerCase().includes(q) ||
          v.tour?.name?.toLowerCase().includes(q)
        );
      })
    : vouchers;
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (displayed.length === 0) {
    const isAdmin = userRole === "super_admin" || userRole === "admin";
    const emptyMessage = searchTerm
      ? `"${searchTerm}" için sonuç bulunamadı.`
      : isAdmin
        ? "Henüz hiç bilet eklenmemiş."
        : "Henüz bilet eklenmemiş veya acentanıza ait bilet bulunmuyor.";

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Bilet bulunamadı</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {displayed.map((voucher) => (
        <VoucherCard key={voucher.id} voucher={voucher} />
      ))}
    </div>
  );
}
