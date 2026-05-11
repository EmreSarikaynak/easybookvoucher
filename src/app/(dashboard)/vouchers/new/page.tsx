import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { VoucherForm } from "@/components/voucher/voucher-form";
import { redirect } from "next/navigation";
import type { Tour } from "@/lib/types";

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

export default async function NewVoucherPage() {
  const currentUser = await getCurrentUser();

  // Herkes erişebilir (Acente / Admin / Satış)

  const tours = await getTours();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-2xl font-bold">Yeni Bilet</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Yeni bir bilet kaydı oluşturun
        </p>
      </div>
      <VoucherForm tours={tours} />
    </div>
  );
}
