"use client";

import { FileText } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import type { Voucher } from "@/lib/types";

interface VoucherListProps {
  vouchers: Voucher[];
  loading?: boolean;
}

export function VoucherList({ vouchers, loading }: VoucherListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Voucher bulunamad&#305;</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hen&uuml;z voucher eklenmemi&#351; veya filtrelere uygun sonu&ccedil; yok.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vouchers.map((voucher) => (
        <VoucherCard key={voucher.id} voucher={voucher} />
      ))}
    </div>
  );
}
