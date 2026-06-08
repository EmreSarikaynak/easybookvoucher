import "server-only";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import type { HelpArticle, HelpNavLink, HelpSection } from "./types";
import { DEFAULT_HELP_ARTICLES } from "./default-pages";
import {
  FOOTER_HELP_FEATURED,
  FOOTER_HELP_QUICK,
  FOOTER_HUB_LINK,
  HELP_HUB_PATH,
} from "./navigation";

export interface HelpPageRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  sections: HelpSection[];
  sort_order: number;
  show_in_footer: boolean;
  footer_group: "featured" | "quick" | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function rowToArticle(row: HelpPageRow): HelpArticle {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    sections: Array.isArray(row.sections) ? row.sections : [],
  };
}

function parseRows(data: unknown[] | null): HelpPageRow[] {
  if (!data?.length) return [];
  return data as HelpPageRow[];
}

export async function fetchPublishedHelpPages(): Promise<HelpArticle[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("help_pages")
      .select(
        "id, slug, title, category, summary, sections, sort_order, show_in_footer, footer_group, is_published, created_at, updated_at"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return DEFAULT_HELP_ARTICLES;
    }
    return parseRows(data).map(rowToArticle);
  } catch {
    return DEFAULT_HELP_ARTICLES;
  }
}

export async function fetchPublishedHelpPageBySlug(
  slug: string
): Promise<HelpArticle | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("help_pages")
      .select(
        "id, slug, title, category, summary, sections, sort_order, show_in_footer, footer_group, is_published, created_at, updated_at"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
    }
    return rowToArticle(data as HelpPageRow);
  } catch {
    return DEFAULT_HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
  }
}

export async function fetchPublishedHelpSlugs(): Promise<string[]> {
  const articles = await fetchPublishedHelpPages();
  return articles.map((a) => a.slug);
}

export async function fetchHelpCategories(): Promise<string[]> {
  const articles = await fetchPublishedHelpPages();
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const a of articles) {
    if (!seen.has(a.category)) {
      seen.add(a.category);
      categories.push(a.category);
    }
  }
  return categories;
}

export async function fetchFooterHelpLinks(): Promise<{
  featured: HelpNavLink[];
  quick: HelpNavLink[];
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("help_pages")
      .select("slug, title, footer_group, sort_order")
      .eq("is_published", true)
      .eq("show_in_footer", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return defaultFooterLinks();
    }

    const featured: HelpNavLink[] = [FOOTER_HUB_LINK];
    const quick: HelpNavLink[] = [];

    for (const row of data) {
      const link: HelpNavLink = {
        href: `${HELP_HUB_PATH}/${row.slug}`,
        label: row.title,
      };
      if (row.footer_group === "featured") featured.push(link);
      else if (row.footer_group === "quick") quick.push(link);
    }

    if (featured.length <= 1 && quick.length === 0) {
      return defaultFooterLinks();
    }

    return { featured, quick };
  } catch {
    return defaultFooterLinks();
  }
}

function defaultFooterLinks(): { featured: HelpNavLink[]; quick: HelpNavLink[] } {
  return {
    featured: FOOTER_HELP_FEATURED,
    quick: FOOTER_HELP_QUICK,
  };
}

/** Sitemap — service role ile yayında olan slug'lar */
export async function fetchPublishedHelpSlugsForSitemap(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("help_pages")
      .select("slug")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return DEFAULT_HELP_ARTICLES.map((a) => a.slug);
    }
    return data.map((r) => r.slug as string);
  } catch {
    return DEFAULT_HELP_ARTICLES.map((a) => a.slug);
  }
}
