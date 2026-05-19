"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { normalizeStoredPhone } from "@/lib/phone";
import { parseWhatsappPhoneSetting } from "@/lib/settings-utils";

export async function getSetting(key: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .single();

    if (error) return null;
    return data.value;
}

export async function updateSetting(key: string, value: any) {
    const supabase = await createServerSupabaseClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Yetkisiz işlem" };
    }

    let storedValue = value;
    if (key === "admin_whatsapp_phone" && typeof value === "string") {
        storedValue =
            normalizeStoredPhone(value) ??
            parseWhatsappPhoneSetting(value) ??
            value.trim();
    }

    const { error } = await supabase
        .from("settings")
        .upsert({
            key,
            value: storedValue,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Setting update error:", error);
        return { error: "Ayarlar kaydedilemedi." };
    }

    revalidatePath("/");
    return { success: true };
}

export async function uploadLogo(formData: FormData) {
    const supabase = await createServerSupabaseClient();
    const file = formData.get("file") as File;

    if (!file) return { error: "Dosya seçilmedi" };

    // 1. Upload to Storage
    // Use a fixed name or timestamped name. Fixed name 'site-logo' overwrites cleanly.
    const fileName = `site-logo-${Date.now()}.${file.name.split('.').pop()}`;
    // Convert File to Buffer for upload if needed?
    // Supabase JS v2 upload accepts File/Blob directly?
    // In Server Actions "formData" yields a node File object which might need buffer conversion for some fetch implementations, 
    // but typically supabase-js handles it if you pass the `File` object from Next.js server actions.
    // However, tour.ts used arrayBuffer() -> Buffer.from(). Let's stick to that for reliability.

    // Convert to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(fileName, buffer, {
            upsert: true,
            contentType: file.type
        });

    if (uploadError) {
        console.error("Upload error:", uploadError);
        return { error: "Logo yüklenemedi." };
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

    // 3. Save to Settings
    const result = await updateSetting("site_logo", publicUrl);

    if (result.error) return result;

    return { success: true, url: publicUrl };
}
