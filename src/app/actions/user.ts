"use server";

import { createServiceRoleClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { formatDbError } from "@/lib/error-messages";

export async function deleteUser(userId: string) {
  const supabase = createServiceRoleClient();

  // İlişkili kayıtları kontrol et (Vouchers)
  const { count: voucherCount, error: voucherError } = await supabase
    .from("vouchers")
    .select("*", { count: "exact", head: true })
    .eq("sales_person_id", userId);

  if (voucherError) {
    console.error("Voucher check error:", voucherError);
  }

  // İlişkili kayıtları kontrol et (Boat Bookings)
  const { count: bookingCount, error: bookingError } = await supabase
    .from("boat_bookings")
    .select("*", { count: "exact", head: true })
    .eq("sales_person_id", userId);

  if (bookingError) {
    console.error("Booking check error:", bookingError);
  }

  if ((voucherCount ?? 0) > 0 || (bookingCount ?? 0) > 0) {
    return { 
      error: "Bu kullanıcıya ait bilet veya rezervasyon kayıtları bulunduğu için tamamen silinemez. Lütfen kullanıcıyı 'Deaktif' duruma getirin." 
    };
  }

  // Profiles table has ON DELETE CASCADE from auth.users, 
  // so deleting the auth user will also delete the profile.
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("User delete error:", error);
    // Hata mesajını daha anlaşılır hale getir
    if (error.message.includes("foreign key constraint")) {
      return { error: "Bu kullanıcı başka verilerle ilişkili olduğu için silinemiyor. Lütfen kullanıcıyı pasif yapın." };
    }
    return { error: formatDbError({ message: error.message }) };
  }

  revalidatePath("/users");
  return { success: true };
}
