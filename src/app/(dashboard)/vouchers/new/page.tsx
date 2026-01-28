"use client";

import { VoucherForm } from "@/components/voucher/voucher-form";

export default function NewVoucherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Yeni Voucher</h1>
        <p className="text-muted-foreground">
          Yeni bir voucher kayd&#305; olu&#351;turun
        </p>
      </div>
      <VoucherForm />
    </div>
  );
}
