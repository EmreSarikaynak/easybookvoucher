import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";

/**
 * PDF'i service role ile Supabase Storage'a yükler (RLS bypass).
 * İstemci tarafı upload RLS nedeniyle production'da başarısız oluyordu.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const formData = await request.formData();
    const voucherId = formData.get("voucherId");
    const file = formData.get("file");

    if (typeof voucherId !== "string" || !voucherId) {
      return NextResponse.json(
        { error: "voucherId zorunludur" },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "PDF dosyası gerekli" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF 10 MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const fileName = `${voucherId}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceSupabase.storage
      .from("voucher-pdfs")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("upload-pdf storage error:", uploadError);
      return NextResponse.json(
        { error: `PDF yüklenemedi: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = serviceSupabase.storage.from("voucher-pdfs").getPublicUrl(fileName);

    const { error: saveError } = await serviceSupabase
      .from("vouchers")
      .update({ pdf_url: publicUrl })
      .eq("id", voucherId);

    if (saveError) {
      console.error("upload-pdf voucher update error:", saveError);
      return NextResponse.json(
        { error: `PDF URL kaydedilemedi: ${saveError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    console.error("upload-pdf API error:", err);
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
