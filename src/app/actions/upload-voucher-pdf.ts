"use server";

import { createServiceRoleClient } from "@/lib/supabase-server";

/** Tarayıcıdan yüklenen PDF'in public URL'ini voucher kaydına yazar. */
export async function saveVoucherPdfUrl(
    voucherId: string,
    publicUrl: string
): Promise<{ url: string } | { error: string }> {
    try {
        const supabase = createServiceRoleClient();
        const { error } = await supabase
            .from("vouchers")
            .update({ pdf_url: publicUrl })
            .eq("id", voucherId);

        if (error) {
            console.error("saveVoucherPdfUrl error:", error);
            return { error: `PDF URL kaydedilemedi: ${error.message}` };
        }

        return { url: publicUrl };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Bilinmeyen hata";
        console.error("saveVoucherPdfUrl unexpected error:", err);
        return { error: message };
    }
}

/**
 * Uploads a PDF (sent as base64 data URI) to Supabase Storage under
 * `voucher-pdfs/{voucherId}.pdf`, then saves the resulting public URL
 * back to the vouchers table and returns it.
 */
export async function uploadVoucherPDF(
    voucherId: string,
    pdfBase64: string   // data:application/pdf;base64,<...>
): Promise<{ url: string } | { error: string }> {
    try {
        const supabase = createServiceRoleClient();

        // Strip the data URI prefix to get raw base64
        const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const fileName = `${voucherId}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from("voucher-pdfs")
            .upload(fileName, buffer, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            console.error("PDF upload error:", uploadError);
            return { error: `PDF yüklenemedi: ${uploadError.message}` };
        }

        const { data: { publicUrl } } = supabase.storage
            .from("voucher-pdfs")
            .getPublicUrl(fileName);

        const saved = await saveVoucherPdfUrl(voucherId, publicUrl);
        if ("error" in saved) {
            return { error: saved.error };
        }

        return { url: publicUrl };
    } catch (err: any) {
        console.error("uploadVoucherPDF unexpected error:", err);
        return { error: err?.message || "Bilinmeyen hata" };
    }
}
