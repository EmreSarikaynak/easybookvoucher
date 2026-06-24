"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import type { HelpSection } from "@/lib/help/types";
import type { HelpPageRow } from "@/components/help/help-pages-manager";

export type HelpPageInput = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  sections: HelpSection[];
  sortOrder: number;
  showInFooter: boolean;
  footerGroup: "featured" | "quick" | null;
  isPublished: boolean;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateInput(input: HelpPageInput): string | null {
  const slug = normalizeSlug(input.slug);
  if (!slug || !SLUG_RE.test(slug)) {
    return "Geçerli bir URL slug girin (ör. bilet-islemleri)";
  }
  if (!input.title.trim()) return "Başlık zorunludur";
  if (!input.category.trim()) return "Kategori zorunludur";
  if (input.showInFooter && !input.footerGroup) {
    return "Footer'da gösterilecek sayfalar için footer grubu seçin";
  }
  if (!input.showInFooter && input.footerGroup) {
    return "Footer grubu yalnızca footer'da gösterilen sayfalarda kullanılabilir";
  }
  if (!input.sections.length) return "En az bir bölüm ekleyin";
  for (const s of input.sections) {
    if (!s.title.trim()) return "Her bölümün başlığı olmalıdır";
    if (!s.paragraphs.some((p) => p.trim())) {
      return `"${s.title}" bölümünde en az bir paragraf girin`;
    }
  }
  return null;
}

function toRowPayload(input: HelpPageInput) {
  return {
    slug: normalizeSlug(input.slug),
    title: input.title.trim(),
    category: input.category.trim(),
    summary: input.summary.trim(),
    sections: input.sections.map((s) => ({
      title: s.title.trim(),
      paragraphs: s.paragraphs.map((p) => p.trim()).filter(Boolean),
      ...(s.tips?.length
        ? { tips: s.tips.map((t) => t.trim()).filter(Boolean) }
        : {}),
      ...(s.adminOnly ? { adminOnly: true } : {}),
    })),
    sort_order: input.sortOrder,
    show_in_footer: input.showInFooter,
    footer_group: input.showInFooter ? input.footerGroup : null,
    is_published: input.isPublished,
  };
}

function revalidateHelpPaths(slug?: string) {
  revalidatePath("/help");
  revalidatePath("/help-pages");
  revalidatePath("/settings");
  if (slug) revalidatePath(`/help/${slug}`);
  revalidatePath("/", "layout");
  revalidatePath("/login", "layout");
  revalidatePath("/dashboard", "layout");
}

export async function listAllHelpPages(): Promise<HelpPageRow[]> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("help_pages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return [];
  return (data ?? []) as HelpPageRow[];
}

export async function createHelpPage(
  input: HelpPageInput
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return { success: false, error: "Yetkisiz" };

  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  const payload = toRowPayload(input);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("help_pages").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Bu slug zaten kullanılıyor" };
    }
    return { success: false, error: error.message };
  }

  revalidateHelpPaths(payload.slug);
  return { success: true };
}

export async function updateHelpPage(
  id: string,
  input: HelpPageInput
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return { success: false, error: "Yetkisiz" };

  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  const payload = toRowPayload(input);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("help_pages")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Bu slug zaten kullanılıyor" };
    }
    return { success: false, error: error.message };
  }

  revalidateHelpPaths(payload.slug);
  return { success: true };
}

export async function deleteHelpPage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return { success: false, error: "Yetkisiz" };

  const supabase = await createServerSupabaseClient();
  const { data: row } = await supabase
    .from("help_pages")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("help_pages").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidateHelpPaths(row?.slug);
  return { success: true };
}

/** Admin önizlemesi — yayında olmayan sayfalar dahil */
export async function getHelpPageForAdminPreview(
  slug: string
): Promise<HelpPageRow | null> {
  const profile = await getCurrentUser();
  if (!isAdmin(profile)) return null;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("help_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as HelpPageRow) ?? null;
}
