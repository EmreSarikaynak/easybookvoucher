import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { sendWhatsAppViaFetch } from "@/lib/twilio-core";

/**
 * Tur Maliyetleri PDF'ini Supabase Storage'a yükler ve
 * acentenin kendi WhatsApp numarasına gönderir.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Oturum gerekli" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const phone = formData.get("phone");
    const agencyName = (formData.get("agencyName") as string) || "";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, error: "PDF dosyası gerekli" },
        { status: 400 }
      );
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Telefon numarası gerekli" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "PDF 10 MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage (service role — RLS bypass)
    const serviceSupabase = createServiceRoleClient();
    const fileName = `tour-costs/${user.id}-${Date.now()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceSupabase.storage
      .from("voucher-pdfs")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("tour-costs upload error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error: `PDF yüklenemedi: ${uploadError.message}`,
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = serviceSupabase.storage.from("voucher-pdfs").getPublicUrl(fileName);

    const today = new Date().toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const body =
      `📊 *TUR MALİYETLERİ RAPORU*\n\n` +
      (agencyName ? `🏢 Acente: ${agencyName}\n` : "") +
      `📅 Tarih: ${today}\n\n` +
      `📄 *Tur Maliyetleri PDF:*\n${publicUrl}\n\n` +
      `EasyBook Tours`;

    const result = await sendWhatsAppViaFetch({
      to: phone.trim(),
      body,
      voucherNo: "TUR-MALIYETLERI",
      includeMedia: false,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, pdfUrl: publicUrl });
  } catch (err: unknown) {
    console.error("tour-costs send-whatsapp error:", err);
    const message =
      err instanceof Error ? err.message : "Beklenmeyen sunucu hatası";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
