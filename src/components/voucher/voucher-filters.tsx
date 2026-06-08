"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useState, useTransition } from "react";

export function VoucherFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/vouchers?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      const timeoutId = setTimeout(() => {
        updateFilters("search", value);
      }, 400);
      return () => clearTimeout(timeoutId);
    },
    [updateFilters]
  );

  return (
    <div className="space-y-3">
      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Misafir adı, bilet no veya tur adı ile ara..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-11"
          disabled={isPending}
        />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) => updateFilters("status", val)}
          disabled={isPending}
        >
          <SelectTrigger className="h-10 w-36">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("sort") ?? "created_desc"}
          onValueChange={(val) => updateFilters("sort", val)}
          disabled={isPending}
        >
          <SelectTrigger className="h-10 w-44">
            <SelectValue placeholder="Sıralama" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Eklenme ↓ (Yeni)</SelectItem>
            <SelectItem value="created_asc">Eklenme ↑ (Eski)</SelectItem>
            <SelectItem value="date_desc">Tur Tarihi ↓</SelectItem>
            <SelectItem value="date_asc">Tur Tarihi ↑</SelectItem>
            <SelectItem value="customer_asc">Müşteri A→Z</SelectItem>
            <SelectItem value="customer_desc">Müşteri Z→A</SelectItem>
            <SelectItem value="price_desc">Fiyat ↓</SelectItem>
            <SelectItem value="price_asc">Fiyat ↑</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={searchParams.get("date") ?? ""}
          onChange={(e) => updateFilters("date", e.target.value)}
          className="h-10 w-40"
          disabled={isPending}
        />
      </div>
    </div>
  );
}
