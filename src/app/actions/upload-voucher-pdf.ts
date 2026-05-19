"use server";

import { createServiceRoleClient } from "@/lib/supabase-server";

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

        // Persist the URL on the voucher row (fire-and-forget, ignore error)
        await supabase
            .from("vouchers")
            .update({ pdf_url: publicUrl })
            .eq("id", voucherId);

        return { url: publicUrl };
    } catch (err: any) {
        console.error("uploadVoucherPDF unexpected error:", err);
        return { error: err?.message || "Bilinmeyen hata" };
    }
}
