"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { CurrencyType } from "@/lib/types";
import { formatDbError } from "@/lib/error-messages";

interface VoucherPayload {
  voucher_no: string;
  tour_id: string | null;
  tour_date: string;
  customer_name: string;
  customer_phone: string | null;
  hotel: string;
  room_no: string;
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  pickup_place: string;
  pickup_time: string | null;
  total_price: number;
  currency: CurrencyType;
  deposit_paid: number;
  notes: string;
}

export async function createVoucher(payload: VoucherPayload) {
  const supabase = await createServerSupabaseClient();

  // Kullanıcı bilgisini al
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor" };
  }

  // Kullanıcının profil bilgisini al
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  const targetAgencyId = profile?.agency_id;
  let agencyPrefix = "EBook";

  if (targetAgencyId) {
    const { data: targetAgency } = await supabase
      .from("agencies")
      .select("agency_code")
      .eq("id", targetAgencyId)
      .single();

    if (targetAgency?.agency_code) {
      agencyPrefix = targetAgency.agency_code;
    }
  }

  let finalVoucherNo = payload.voucher_no;

  if (!finalVoucherNo || finalVoucherNo === "OTOMATIK" || finalVoucherNo.includes("OTOMATIK")) {
    const { data: latest } = await supabase
      .from("vouchers")
      .select("voucher_no")
      .ilike("voucher_no", `${agencyPrefix}%`)
      .order("created_at", { ascending: false })
      .limit(100);

    let maxNo = 0;
    if (latest) {
      latest.forEach((v) => {
        const str = v.voucher_no || "";
        const escapedPrefix = agencyPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedPrefix}-?(\\d+)$`, "i");
        const match = str.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNo) maxNo = num;
        }
      });
    }

    if (agencyPrefix.toLowerCase() === "ebook") {
      finalVoucherNo = `EBook-${maxNo + 1}`;
    } else {
      finalVoucherNo = `${agencyPrefix}${maxNo + 1}`;
    }
  }

  const { error } = await supabase.from("vouchers").insert({
    ...payload,
    voucher_no: finalVoucherNo,
    tour_id: payload.tour_id || null,
    pickup_time: payload.pickup_time || null,
    customer_phone: payload.customer_phone || null,
    sales_person_id: user.id,
    agency_id: profile?.agency_id || null,
    status: "active",
  });

  if (error) {
    console.error("Voucher create error:", error);
    return { error: formatDbError(error) };
  }

  // Bilet başarıyla oluşturulduktan sonra WhatsApp mesajı gönder
  if (payload.customer_phone) {
    let tourName = "Belirtilmemiş Tur";
    
    // Tur adını getir
    if (payload.tour_id) {
      const { data: tourData } = await supabase
        .from("tours")
        .select("name")
        .eq("id", payload.tour_id)
        .single();
        
      if (tourData?.name) {
        tourName = tourData.name;
      }
    }

    try {
      const { sendWhatsAppMessage } = await import("@/lib/twilio");
      const result = await sendWhatsAppMessage({
        to: payload.customer_phone,
        voucherNo: finalVoucherNo,
        tourName: tourName,
        tourDate: payload.tour_date,
        customerName: payload.customer_name
      });
      
      if (!result.success) {
        console.warn("WhatsApp mesajı gönderilemedi:", result.error);
      }
    } catch (waError) {
      console.error("WhatsApp modülü yüklenirken/çalışırken hata:", waError);
    }
  }

  revalidatePath("/vouchers");
  return { success: true };
}

export async function updateVoucher(id: string, payload: VoucherPayload) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("vouchers")
    .update({
      ...payload,
      tour_id: payload.tour_id || null,
      pickup_time: payload.pickup_time || null,
      customer_phone: payload.customer_phone || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Voucher update error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/vouchers");
  revalidatePath(`/vouchers/${id}`);
  return { success: true };
}

/**
 * Admin: re-send the WhatsApp voucher confirmation for a given voucher.
 * Pulls voucher + tour data fresh from the DB and goes through the same
 * Twilio path as createVoucher does, so the new send shows up in
 * whatsapp_logs and gets a statusCallback.
 */
export async function resendVoucherWhatsApp(voucherNo: string) {
  const supabase = await createServerSupabaseClient();

  const { data: voucher, error } = await supabase
    .from("vouchers")
    .select("*, tour:tours(name)")
    .eq("voucher_no", voucherNo)
    .single();

  if (error || !voucher) {
    return { error: "Bilet bulunamadı" };
  }

  if (!voucher.customer_phone) {
    return { error: "Müşteri telefonu kayıtlı değil" };
  }

  try {
    const { sendWhatsAppMessage } = await import("@/lib/twilio");
    const result = await sendWhatsAppMessage({
      to: voucher.customer_phone,
      voucherNo: voucher.voucher_no,
      tourName: voucher.tour?.name || "Tur",
      tourDate: voucher.tour_date,
      customerName: voucher.customer_name,
    });

    if (!result.success) {
      return { error: result.error || "Gönderim başarısız" };
    }

    revalidatePath("/whatsapp-logs");
    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error("Resend WhatsApp error:", err);
    return { error: err?.message || "Beklenmeyen hata" };
  }
}

export async function updateVoucherPaymentStatus(id: string, isPaid: boolean) {
  const supabase = await createServerSupabaseClient();

  const statusStr = isPaid ? "paid" : "pending";
  const dateStr = isPaid ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("vouchers")
    .update({
      agency_payment_status: statusStr,
      agency_payment_date: dateStr,
    })
    .eq("id", id);

  if (error) {
    console.error("Payment status update error:", error);
    return { error: formatDbError(error) };
  }

  revalidatePath("/reports");
  return { success: true };
}
