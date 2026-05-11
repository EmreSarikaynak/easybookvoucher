"use server";

import { createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";
import type { UserRole } from "@/lib/types";

export async function createUser(input: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  agency_id: string | null;
  phone: string | null;
}) {
  const supabase = createServiceRoleClient();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });

  if (authError || !authData?.user) {
    return {
      error: formatDbError({
        message: authError?.message ?? "Kullanıcı oluşturulamadı.",
      }),
    };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authData.user.id,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      agency_id: input.agency_id,
      phone: input.phone,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: formatDbError({ message: profileError.message }) };
  }

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = createServiceRoleClient();

  const { count: voucherCount, error: voucherError } = await supabase
    .from("vouchers")
    .select("*", { count: "exact", head: true })
    .eq("sales_person_id", userId);

  if (voucherError) {
    console.error("Voucher check error:", voucherError);
  }

  const { count: bookingCount, error: bookingError } = await supabase
    .from("boat_bookings")
    .select("*", { count: "exact", head: true })
    .eq("sales_person_id", userId);

  if (bookingError) {
    console.error("Booking check error:", bookingError);
  }

  if ((voucherCount ?? 0) > 0 || (bookingCount ?? 0) > 0) {
    return {
      error:
        "Bu kullanıcıya ait bilet veya rezervasyon kayıtları bulunduğu için tamamen silinemez. Lütfen kullanıcıyı 'Deaktif' duruma getirin.",
    };
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("User delete error:", error);
    if (error.message.includes("foreign key constraint")) {
      return {
        error:
          "Bu kullanıcı başka verilerle ilişkili olduğu için silinemiyor. Lütfen kullanıcıyı pasif yapın.",
      };
    }
    return { error: formatDbError({ message: error.message }) };
  }

  revalidatePath("/users");
  return { success: true };
}
