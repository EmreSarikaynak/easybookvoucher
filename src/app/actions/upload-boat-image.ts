"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const BUCKET_NAME = "boat-gallery";

export async function uploadBoatImage(
    formData: FormData
): Promise<{ url: string | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const file = formData.get("file") as File | null;

        if (!file) {
            return { url: null, error: "Dosya bulunamadı" };
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return {
                url: null,
                error: "Geçersiz dosya tipi. Sadece JPEG, PNG, WebP ve AVIF kabul edilir.",
            };
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return {
                url: null,
                error: "Dosya boyutu 5MB'dan büyük olamaz.",
            };
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `boats/${uniqueName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            console.error("Storage upload error:", error);
            return { url: null, error: `Yükleme hatası: ${error.message}` };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return { url: urlData.publicUrl, error: null };
    } catch (error) {
        console.error("Unexpected upload error:", error);
        return { url: null, error: "Görsel yüklenirken beklenmeyen bir hata oluştu" };
    }
}

export async function deleteBoatImage(
    imageUrl: string
): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        // Extract file path from URL
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/boat-gallery\/(.+)/);

        if (!pathMatch) {
            return { success: false, error: "Geçersiz görsel URL'si" };
        }

        const filePath = pathMatch[1];

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            console.error("Storage delete error:", error);
            return { success: false, error: `Silme hatası: ${error.message}` };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("Unexpected delete error:", error);
        return { success: false, error: "Görsel silinirken hata oluştu" };
    }
}
