"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { CurrencyType } from "@/lib/types";
import { formatDbError } from "@/lib/error-messages";
import { parseWhatsappPhoneSetting } from "@/lib/settings-utils";
import { normalizeStoredPhone } from "@/lib/phone";

function normalizeVoucherPayloadPhones(payload: VoucherPayload): VoucherPayload {
  return {
    ...payload,
    customer_phone: normalizeStoredPhone(payload.customer_phone),
  };
}

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
  payload = normalizeVoucherPayloadPhones(payload);
  const supabase = await createServerSupabaseClient();

  // Kullanıcı bilgisini al
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor" };
  }

  // Kullanıcının profil bilgisini al (sales person tarafı için phone de lazım)
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, phone, full_name")
    .eq("id", user.id)
    .single();

  const targetAgencyId = profile?.agency_id;
  let agencyPrefix = "EBook";
  let agencyName: string | null = null;
  let agencyPhone: string | null = null;

  if (targetAgencyId) {
    const { data: targetAgency } = await supabase
      .from("agencies")
      .select("agency_code, name, phone")
      .eq("id", targetAgencyId)
      .single();

    if (targetAgency?.agency_code) {
      agencyPrefix = targetAgency.agency_code;
    }
    agencyName = targetAgency?.name ?? null;
    agencyPhone = normalizeStoredPhone(targetAgency?.phone ?? null);
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

  const { data: insertedRows, error } = await supabase.from("vouchers").insert({
    ...payload,
    voucher_no: finalVoucherNo,
    tour_id: payload.tour_id || null,
    pickup_time: payload.pickup_time || null,
    customer_phone: payload.customer_phone || null,
    sales_person_id: user.id,
    agency_id: profile?.agency_id || null,
    status: "active",
  }).select("id").single();

  const insertedId: string | undefined = insertedRows?.id;

  if (error) {
    console.error("Voucher create error:", error);
    return { error: formatDbError(error) };
  }


  // Bilet kaydedildikten sonra ilgili herkese WhatsApp bildirimi gönder.
  // Sıra: müşteri (TR/EN, prefix'e göre) + EasyBook + acente + sales person.
  let tourName = "Belirtilmemiş Tur";
  if (payload.tour_id) {
    const { data: tourData } = await supabase
      .from("tours")
      .select("name")
      .eq("id", payload.tour_id)
      .single();
    if (tourData?.name) tourName = tourData.name;
  }

  const adminPhoneFromSettings = await readAdminWhatsappPhone(supabase);

  try {
    const { sendVoucherNotifications } = await import("@/lib/twilio");
    await sendVoucherNotifications({
      customerPhone: payload.customer_phone ?? null,
      agencyPhone: agencyPhone,
      salesPersonPhone: profile?.phone ?? null,
      adminPhoneFromSettings,
      voucher: {
        voucherNo: finalVoucherNo,
        tourName,
        tourDate: payload.tour_date,
        customerName: payload.customer_name,
        agencyName,
      },
    });
  } catch (waError) {
    console.error("WhatsApp bildirimleri gönderilirken hata:", waError);
  }

  revalidatePath("/vouchers");
  return { success: true, voucherId: insertedId };
}

/**
 * Sends WhatsApp text+PDF URL notifications for a voucher.
 * Recipients: hardcoded EasyBook number + admin setting (deduped) + agency.
 * PDF is already uploaded; caller provides the public URL.
 */
async function readAdminWhatsappPhone(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string | null> {
  const { data: settingRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_whatsapp_phone")
    .maybeSingle();

  return parseWhatsappPhoneSetting(settingRow?.value);
}

export async function sendVoucherPDFWhatsApp(
  voucherId: string,
  pdfUrl: string,
  isRevised?: boolean,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: voucher, error: vErr } = await supabase
      .from("vouchers")
      .select("*, tour:tours(name), agency:agencies(name, phone), sales_person:profiles!vouchers_sales_person_id_fkey(full_name)")
      .eq("id", voucherId)
      .single();

    if (vErr || !voucher) {
      return { success: false, error: "Bilet bulunamadı" };
    }

    const adminPhoneFromSettings = await readAdminWhatsappPhone(supabase);

    const agency =
      voucher.agency && !Array.isArray(voucher.agency) ? voucher.agency : null;

    const { sendVoucherPDFNotificationsFetch } = await import("@/lib/twilio-core");
    const resolvedImageUrl = imageUrl ?? pdfUrl.replace(/\.pdf$/i, ".jpg");
    const result = await sendVoucherPDFNotificationsFetch({
      pdfUrl,
      imageUrl: resolvedImageUrl,
      isRevised,
      agencyPhone: agency?.phone ?? null,
      adminPhoneFromSettings,
      voucher: {
        voucherNo: voucher.voucher_no,
        tourName: voucher.tour?.name || "Tur",
        tourDate: voucher.tour_date,
        customerName: voucher.customer_name,
        customerPhone: voucher.customer_phone,
        hotel: voucher.hotel,
        pickupTime: voucher.pickup_time,
        pickupPlace: voucher.pickup_place,
        paxAdult: voucher.pax_adult,
        paxChild: voucher.pax_child,
        paxInfant: voucher.pax_infant,
        agencyName: agency?.name ?? null,
      },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (err: unknown) {
    console.error("sendVoucherPDFWhatsApp error:", err);
    const message = err instanceof Error ? err.message : "WhatsApp gönderilemedi";
    return { success: false, error: message };
  }
}

export async function updateVoucher(id: string, payload: VoucherPayload) {
  payload = normalizeVoucherPayloadPhones(payload);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("vouchers")
    .update({
      ...payload,
      tour_id: payload.tour_id || null,
      pickup_time: payload.pickup_time || null,
      customer_phone: payload.customer_phone,
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
 * Admin: re-send the full set of voucher WhatsApp notifications (customer,
 * EasyBook internal, agency, sales person) for a given voucher number.
 * Pulls everything fresh from the DB so a resend reflects the current state.
 */
export async function resendVoucherWhatsApp(voucherNo: string) {
  const supabase = await createServerSupabaseClient();

  const { data: voucher, error } = await supabase
    .from("vouchers")
    .select(
      "*, tour:tours(name), agency:agencies(name, phone), sales_person:profiles!vouchers_sales_person_id_fkey(phone, full_name)"
    )
    .eq("voucher_no", voucherNo)
    .single();

  if (error || !voucher) {
    return { error: "Bilet bulunamadı" };
  }

  const adminPhoneFromSettings = await readAdminWhatsappPhone(supabase);
  const agency =
    voucher.agency && !Array.isArray(voucher.agency) ? voucher.agency : null;

  try {
    // PDF varsa tam bildirim seti (admin / acente / müşteri ayrı metinler)
    if (voucher.pdf_url) {
      const { sendVoucherPDFNotificationsFetch } = await import("@/lib/twilio-core");
      const imageUrl = String(voucher.pdf_url).replace(/\.pdf$/i, ".jpg");
      const result = await sendVoucherPDFNotificationsFetch({
        pdfUrl: voucher.pdf_url,
        imageUrl,
        agencyPhone: agency?.phone ?? null,
        adminPhoneFromSettings,
        voucher: {
          voucherNo: voucher.voucher_no,
          tourName: voucher.tour?.name || "Tur",
          tourDate: voucher.tour_date,
          customerName: voucher.customer_name,
          customerPhone: voucher.customer_phone,
          hotel: voucher.hotel,
          pickupTime: voucher.pickup_time,
          pickupPlace: voucher.pickup_place,
          paxAdult: voucher.pax_adult,
          paxChild: voucher.pax_child,
          paxInfant: voucher.pax_infant,
          agencyName: agency?.name ?? null,
        },
      });

      revalidatePath("/whatsapp-logs");

      if (!result.success) {
        return { error: result.error || "Gönderilemedi" };
      }
      return { success: true, sent: result.sent, failed: 0 };
    }

    const { sendVoucherNotifications } = await import("@/lib/twilio");
    const { results } = await sendVoucherNotifications({
      customerPhone: voucher.customer_phone ?? null,
      agencyPhone: agency?.phone ?? null,
      salesPersonPhone: voucher.sales_person?.phone ?? null,
      adminPhoneFromSettings,
      voucher: {
        voucherNo: voucher.voucher_no,
        tourName: voucher.tour?.name || "Tur",
        tourDate: voucher.tour_date,
        customerName: voucher.customer_name,
        agencyName: agency?.name ?? null,
      },
    });

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    revalidatePath("/whatsapp-logs");

    if (successCount === 0) {
      return { error: results[0]?.error || "Hiçbir alıcıya gönderilemedi" };
    }
    return {
      success: true,
      sent: successCount,
      failed: failCount,
      results,
    };
  } catch (err: unknown) {
    console.error("Resend WhatsApp error:", err);
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return { error: message };
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
