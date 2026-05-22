import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin, canViewTours } from "@/lib/auth-helpers";
import { CATALOG_LANGUAGES, type CatalogLang } from "@/lib/tour-i18n";
import { generateTourCatalogPdfBuffer } from "@/lib/tour-catalog-pdf";
import {
  buildCatalogWhatsAppBody,
  fetchCatalogPdfDataset,
} from "@/lib/tour-catalog-data";
import { sendWhatsAppViaFetch } from "@/lib/twilio-core";

/**
 * Tur kataloğu PDF'ini sunucuda üretir, Storage'a yükler ve
 * müşteri telefonuna WhatsApp ile gönderir.
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

    const body = (await request.json()) as {
      phone?: string;
      lang?: string;
      agencyId?: string;
    };

    const phone = body.phone?.trim();
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Telefon numarası gerekli" },
        { status: 400 }
      );
    }

    const langParam = body.lang || "tr";
    const lang = (
      CATALOG_LANGUAGES.includes(langParam as CatalogLang) ? langParam : "tr"
    ) as CatalogLang;

    let agencyId = body.agencyId;
    const admin = isAdmin(profile);

    if (!admin) {
      agencyId = profile.agency_id ?? undefined;
    }

    if (!agencyId) {
      return NextResponse.json(
        { success: false, error: "agencyId zorunludur" },
        { status: 400 }
      );
    }

    if (!admin && profile.agency_id !== agencyId) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz" },
        { status: 403 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: dataset, error: dataError } = await fetchCatalogPdfDataset(
      supabase,
      agencyId
    );

    if (!dataset || dataError) {
      return NextResponse.json(
        { success: false, error: dataError ?? "Veri yüklenemedi" },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateTourCatalogPdfBuffer({
      tours: dataset.tours,
      prices: dataset.prices,
      lang,
      agencyName: dataset.agencyName,
    });

    const serviceSupabase = createServiceRoleClient();
    const safeAgency = dataset.agencyName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 24);
    const fileName = `catalog/${agencyId}/${safeAgency}-${lang}-${Date.now()}.pdf`;

    const { error: uploadError } = await serviceSupabase.storage
      .from("voucher-pdfs")
      .upload(fileName, pdfBuffer, {
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

    const waBody = buildCatalogWhatsAppBody(lang, publicUrl, dataset.agencyName);

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
      err instanceof Error ? err.message : "Beklenmeyen sunucu hatası";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
