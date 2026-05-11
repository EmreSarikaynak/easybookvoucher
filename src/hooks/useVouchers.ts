"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { Voucher, VoucherStatus } from "@/lib/types";

interface VoucherFilters {
  status?: VoucherStatus;
  tourDate?: string;
  search?: string;
  agencyId?: string;
}

export function useVouchers(filters?: VoucherFilters) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase client - useMemo ile stable referans
  const supabase = useMemo(() => createClient(), []);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("vouchers")
        .select(
          `
          *,
          tour:tours(*),
          sales_person:profiles!vouchers_sales_person_id_fkey(*),
          agency:agencies(*)
        `
        )
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.tourDate) {
        query = query.eq("tour_date", filters.tourDate);
      }
      if (filters?.search) {
        query = query.or(
          `customer_name.ilike.%${filters.search}%,voucher_no.ilike.%${filters.search}%`
        );
      }
      if (filters?.agencyId) {
        query = query.eq("agency_id", filters.agencyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Vouchers fetch error:", fetchError);
        setError(fetchError.message);
      } else {
        setVouchers(data ?? []);
      }
    } catch (err) {
      console.error("Vouchers fetch exception:", err);
      setError("Biletler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [supabase, filters?.status, filters?.tourDate, filters?.search, filters?.agencyId]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const deleteVoucher = async (id: string) => {
    const { error: deleteError } = await supabase
      .from("vouchers")
      .update({ status: "cancelled" as VoucherStatus })
      .eq("id", id);

    if (deleteError) throw deleteError;
    await fetchVouchers();
  };

  return {
    vouchers,
    loading,
    error,
    refetch: fetchVouchers,
    deleteVoucher,
  };
}
