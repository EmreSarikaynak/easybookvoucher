import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { VoucherForm } from "@/components/voucher/voucher-form";
import type { Voucher, Tour } from "@/lib/types";

interface PageProps {
  params: { id: string };
}

async function getVoucher(id: string): Promise<Voucher | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("vouchers")
    .select(`
      *,
      tour:tours(*),
      sales_person:profiles!vouchers_sales_person_id_fkey(*),
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

async function getTours(): Promise<Tour[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Tours fetch error:", error);
    return [];
  }

  return data ?? [];
}

import { getCurrentUser } from "@/lib/auth-helpers";

export default async function EditVoucherPage({ params }: PageProps) {
  const [voucher, tours, currentUser] = await Promise.all([
    getVoucher(params.id),
    getTours(),
    getCurrentUser(),
  ]);

  if (!voucher) {
    notFound();
  }

  // Acente sadece kendi biletini düzenleyebilir
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  if (!isAdmin) {
    const isOwner = 
      (currentUser?.agency_id && voucher.agency_id === currentUser.agency_id) || 
      (!currentUser?.agency_id && voucher.sales_person_id === currentUser?.id);
      
    if (!isOwner) {
      notFound();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bilet Düzenle</h1>
        <p className="text-muted-foreground">
          {voucher.voucher_no} - {voucher.customer_name}
        </p>
      </div>
      <VoucherForm voucher={voucher} tours={tours} />
    </div>
  );
}
