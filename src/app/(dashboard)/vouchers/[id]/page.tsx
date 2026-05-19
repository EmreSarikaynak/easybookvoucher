import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { VoucherDetailContent } from "@/components/voucher/voucher-detail-content";
import type { Voucher } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ new?: string; revised?: string }>;
}

async function getVoucher(id: string): Promise<Voucher | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("vouchers")
    .select(`
      *,
      tour:tours(*),
      sales_person:profiles!vouchers_sales_person_id_fkey(*, agency:agencies(*)),
      agency:agencies(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Voucher fetch error:", error);
    return null;
  }

  return data;
}

import { getCurrentUser } from "@/lib/auth-helpers";

export default async function VoucherDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const [voucher, currentUser] = await Promise.all([
    getVoucher(resolvedParams.id),
    getCurrentUser(),
  ]);

  if (!voucher) {
    notFound();
  }

  // Acente sadece kendi biletini görebilir
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  if (!isAdmin) {
    const isOwner = 
      (currentUser?.agency_id && voucher.agency_id === currentUser.agency_id) || 
      (!currentUser?.agency_id && voucher.sales_person_id === currentUser?.id);
      
    if (!isOwner) {
      notFound();
    }
  }

  const isNewVoucher = resolvedSearchParams?.new === "1";
  const isRevisedVoucher = resolvedSearchParams?.revised === "1";

  return (
    <VoucherDetailContent 
      voucher={voucher} 
      isAdmin={isAdmin} 
      isNewVoucher={isNewVoucher} 
      isRevisedVoucher={isRevisedVoucher} 
    />
  );
}
