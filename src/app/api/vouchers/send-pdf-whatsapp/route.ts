import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { parseWhatsappPhoneSetting } from "@/lib/settings-utils";
import { sendVoucherPDFNotificationsFetch } from "@/lib/twilio-core";

/**
 * PDF yüklendikten sonra WhatsApp bildirimi gönderir.
 * pdfUrl: Supabase Storage public URL (mesaj metninde + Twilio MediaUrl olarak gider).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum gerekli" }, { status: 401 });
    }

    const payload = (await request.json()) as {
      voucherId?: string;
      pdfUrl?: string;
      imageUrl?: string;
      isRevised?: boolean;
    };

    const { voucherId, pdfUrl, isRevised } = payload;
    const imageUrl =
      payload.imageUrl ?? pdfUrl?.replace(/\.pdf$/i, ".jpg");

    if (!voucherId || !pdfUrl) {
      return NextResponse.json(
        { success: false, error: "voucherId ve pdfUrl zorunludur" },
        { status: 400 }
      );
    }

    // PDF URL'ini kaydet (service role — tüm roller için)
    const serviceSupabase = createServiceRoleClient();
    const { error: saveError } = await serviceSupabase
      .from("vouchers")
      .update({ pdf_url: pdfUrl })
      .eq("id", voucherId);

    if (saveError) {
      console.error("PDF URL kayıt hatası:", saveError);
      return NextResponse.json(
        { success: false, error: `PDF URL kaydedilemedi: ${saveError.message}` },
        { status: 500 }
      );
    }

    const { data: voucher, error: vErr } = await supabase
      .from("vouchers")
      .select(
        "*, tour:tours(name), agency:agencies(name, phone), sales_person:profiles!vouchers_sales_person_id_fkey(full_name)"
      )
      .eq("id", voucherId)
      .single();

    if (vErr || !voucher) {
      return NextResponse.json(
        { success: false, error: "Bilet bulunamadı" },
        { status: 404 }
      );
    }

    const { data: settingRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_whatsapp_phone")
      .maybeSingle();

    const adminPhoneFromSettings = parseWhatsappPhoneSetting(settingRow?.value);

    const agency =
      voucher.agency && !Array.isArray(voucher.agency) ? voucher.agency : null;

    const result = await sendVoucherPDFNotificationsFetch({
      pdfUrl,
      imageUrl,
      isRevised: Boolean(isRevised),
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
      return NextResponse.json(
        { success: false, error: result.error, sent: result.sent },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      pdfUrl,
    });
  } catch (err: unknown) {
    console.error("send-pdf-whatsapp API error:", err);
    const message = err instanceof Error ? err.message : "Beklenmeyen sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
