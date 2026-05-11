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
      // Debounce için basit timeout
      const timeoutId = setTimeout(() => {
        updateFilters("search", value);
      }, 500);
      return () => clearTimeout(timeoutId);
    },
    [updateFilters]
  );

  return (
    <div className="space-y-3">
      {/* Arama - Her zaman tam genişlik */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Misafir adı veya bilet no ile ara..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-11"
          disabled={isPending}
        />
      </div>
      
      {/* Filtreler - Mobilde yan yana, dar ekranda küçük */}
      <div className="flex gap-2">
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) => updateFilters("status", val)}
          disabled={isPending}
        >
          <SelectTrigger className="flex-1 h-10">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={searchParams.get("date") ?? ""}
          onChange={(e) => updateFilters("date", e.target.value)}
          className="flex-1 h-10"
          disabled={isPending}
        />
      </div>
    </div>
  );
}
