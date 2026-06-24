import { Suspense } from "react";
import { VoucherList } from "@/components/voucher/voucher-list";
import { VouchersByAgency } from "@/components/voucher/vouchers-by-agency";
import { VoucherFilters } from "@/components/voucher/voucher-filters";
import { NewVoucherButton } from "@/components/voucher/new-voucher-button";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { Voucher } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    date?: string;
    sort?: string;
  }>;
}

async function getVouchers(searchParams: { search?: string; status?: string; date?: string; sort?: string }, currentUser: any): Promise<Voucher[]> {
  const supabase = await createServerSupabaseClient();

  const sortMap: Record<string, { col: string; asc: boolean }> = {
    date_desc:     { col: "tour_date",     asc: false },
    date_asc:      { col: "tour_date",     asc: true  },
    created_desc:  { col: "created_at",    asc: false },
    created_asc:   { col: "created_at",    asc: true  },
    customer_asc:  { col: "customer_name", asc: true  },
    customer_desc: { col: "customer_name", asc: false },
    price_desc:    { col: "total_price",   asc: false },
    price_asc:     { col: "total_price",   asc: true  },
  };
  const { col, asc } = sortMap[searchParams.sort ?? ""] ?? { col: "created_at", asc: false };

  let query = supabase
    .from("vouchers")
    .select(`
      *,
      tour:tours(*),
      sales_person:profiles!vouchers_sales_person_id_fkey(*),
      agency:agencies(*)
    `)
    .order(col, { ascending: asc });

  if (currentUser?.role !== "super_admin" && currentUser?.role !== "admin") {
    if (currentUser?.agency_id) {
      query = query.eq("agency_id", currentUser.agency_id);
    } else {
      query = query.eq("sales_person_id", currentUser.id);
    }
  }

  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.date) {
    query = query.eq("tour_date", searchParams.date);
  }

  if (searchParams.search) {
    query = query.or(
      `customer_name.ilike.%${searchParams.search}%,voucher_no.ilike.%${searchParams.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Vouchers fetch error:", error);
    return [];
  }

  return data ?? [];
}

export default async function VouchersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  const vouchers = await getVouchers(resolvedSearchParams, currentUser);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const pageTitle = isAdmin ? "Tüm Biletler" : "Biletlerim";
  const pageDescription = isAdmin
    ? "Tüm acenta biletlerini görüntüleyin ve yönetin"
    : "Acentanıza ait bilet kayıtlarını görüntüleyin ve yönetin";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {pageDescription}
          </p>
        </div>
        {/* Masaüstünde göster, mobilde alt navigasyonda var */}
        <NewVoucherButton />
      </div>

      <Suspense fallback={<div className="h-11 w-full animate-pulse bg-muted rounded-md"></div>}>
        <VoucherFilters />
      </Suspense>

      {isAdmin ? (
        <VouchersByAgency vouchers={vouchers} searchTerm={resolvedSearchParams.search} />
      ) : (
        <VoucherList vouchers={vouchers} loading={false} userRole={currentUser?.role} searchTerm={resolvedSearchParams.search} />
      )}
    </div>
  );
}
