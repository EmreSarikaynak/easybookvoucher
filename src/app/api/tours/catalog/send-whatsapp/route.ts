import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import { CATALOG_LANGUAGES, type CatalogLang } from "@/lib/tour-i18n";
import { buildCatalogWhatsAppBody } from "@/lib/tour-catalog-data";
import { sendWhatsAppViaFetch } from "@/lib/twilio-core";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tur Kataloğu WhatsApp gönderim endpoint'i.
 *
 * Mimari: PDF tarayıcıda üretilir (Cloudflare Workers yoga WASM çalıştıramıyor).
 * Bu endpoint multipart/form-data ile gelir:
 *   - pdf: File (Blob)
 *   - phone, lang, agencyId, agencyName: string
 *
 * Server tarafı sadece: Storage upload + WhatsApp gönderim.
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentUser();
    if (!profile || !canViewTours(profile)) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz" },
        { status: 401 }
      );
    }

    const form = await request.formData();
    const pdfFile = form.get("pdf");
    const phone = (form.get("phone") as string | null)?.trim();
    const langRaw = (form.get("lang") as string | null) ?? "tr";
    const agencyId = (form.get("agencyId") as string | null) ?? "";
    const agencyName = (form.get("agencyName") as string | null) ?? "";

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Telefon numarası gerekli" },
        { status: 400 }
      );
    }
    if (!(pdfFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: "PDF dosyası gerekli (multipart 'pdf' alanı)" },
        { status: 400 }
      );
    }

    const lang = (
      CATALOG_LANGUAGES.includes(langRaw as CatalogLang) ? langRaw : "tr"
    ) as CatalogLang;

    const admin = isAdmin(profile);
    const finalAgencyId = admin ? agencyId : profile.agency_id ?? "";

    if (!finalAgencyId) {
      return NextResponse.json(
        { success: false, error: "agencyId zorunludur" },
        { status: 400 }
      );
    }
    if (!admin && profile.agency_id !== finalAgencyId) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz" },
        { status: 403 }
      );
    }

    // Upload (service role; bucket için kullanıcı RLS yazmaya gerek kalmasın)
    const serviceSupabase = createServiceRoleClient();
    const safeAgency = (agencyName || "katalog")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 24);
    const fileName = `catalog/${finalAgencyId}/${safeAgency}-${lang}-${Date.now()}.pdf`;

    const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());

    const { error: uploadError } = await serviceSupabase.storage
      .from("voucher-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("catalog upload error:", uploadError);
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

    const waBody = buildCatalogWhatsAppBody(lang, publicUrl, agencyName);

    const result = await sendWhatsAppViaFetch({
      to: phone,
      body: waBody,
      voucherNo: `KATALOG-${lang.toUpperCase()}`,
      includeMedia: false,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    console.error("catalog send-whatsapp error:", err);
    const message =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
