"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoucherList } from "@/components/voucher/voucher-list";
import { useVouchers } from "@/hooks/useVouchers";
import type { VoucherStatus } from "@/lib/types";

export default function VouchersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VoucherStatus | "all">("all");
  const [tourDate, setTourDate] = useState("");

  const { vouchers, loading } = useVouchers({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    tourDate: tourDate || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voucher&apos;lar</h1>
          <p className="text-muted-foreground">
            T&uuml;m voucher kay&#305;tlar&#305;n&#305; g&ouml;r&uuml;nt&uuml;leyin ve y&ouml;netin
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vouchers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Voucher
          </Link>
        </Button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Misafir ad&#305; veya voucher no ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(val) => setStatus(val as VoucherStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">T&uuml;m&uuml;</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="cancelled">&#304;ptal</SelectItem>
            <SelectItem value="completed">Tamamland&#305;</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={tourDate}
          onChange={(e) => setTourDate(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      <VoucherList vouchers={vouchers} loading={loading} />
    </div>
  );
}
