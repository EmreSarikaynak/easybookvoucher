/**
 * Tur Kataloğu — Toplu çeviri.
 *
 * Tüm aktif turlarda:
 *   - TR alanı doluysa VE EN/RU/PL'den bazıları tamamen boşsa → DeepL ile o dilleri doldurur.
 *   - Sonra tek seferde tüm değişen tur kayıtlarını DB'ye yazar.
 *
 * Auth: tur yöneticisi yetkisi gerekir. Sadece POST.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, canManageTours } from "@/lib/auth-helpers";
import {
  TOUR_LANGUAGES,
  normalizeTourTranslations,
  type TourLang,
  type TourTranslationContent,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { translateTourBundle } from "@/lib/deepl";

export const runtime = "nodejs";
export const maxDuration = 60;

function isLangEmpty(t: TourTranslationContent | undefined | null): boolean {
  if (!t) return true;
  const hasText =
    t.name?.trim() ||
    t.description?.trim() ||
    (t.highlights ?? []).some((x) => x.trim()) ||
    (t.details ?? []).some((x) => x.trim()) ||
    (t.included ?? []).some((x) => x.trim()) ||
    (t.excluded ?? []).some((x) => x.trim());
  return !hasText;
}

interface TourRow {
  id: string;
  name: string;
  description: string | null;
  translations: TourTranslations | null;
}

export async function POST() {
  const profile = await getCurrentUser();
  if (!canManageTours(profile)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!process.env.DEEPL_API_KEY) {
    return NextResponse.json(
      { error: "DEEPL_API_KEY tanımlı değil" },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: tours, error: toursErr } = await supabase
    .from("tours")
    .select("id, name, description, translations")
    .eq("is_active", true);

  if (toursErr || !tours) {
    return NextResponse.json(
      { error: toursErr?.message ?? "Tur listesi alınamadı" },
      { status: 500 }
    );
  }

  const summary = {
    total: tours.length,
    translated: 0,
    skipped: 0,
    failed: 0,
    perLang: { en: 0, ru: 0, pl: 0 } as Record<string, number>,
  };
  const errors: string[] = [];

  for (const t of tours as TourRow[]) {
    const normalized = normalizeTourTranslations(
      t.translations,
      t.name,
      t.description
    );
    const tr = normalized.tr;

    // TR boşsa çeviremeyiz
    if (!tr || isLangEmpty(tr)) {
      summary.skipped++;
      continue;
    }

    const targets: TourLang[] = TOUR_LANGUAGES.filter(
      (l) => l !== "tr" && isLangEmpty(normalized[l])
    );

    if (targets.length === 0) {
      summary.skipped++;
      continue;
    }

    try {
      const next: TourTranslations = { ...normalized };
      for (const lang of targets) {
        const r = await translateTourBundle(
          {
            name: tr.name,
            description: tr.description,
            highlights: tr.highlights ?? [],
            details: tr.details ?? [],
            included: tr.included ?? [],
            excluded: tr.excluded ?? [],
          },
          lang,
          "tr"
        );
        next[lang] = {
          name: r.name ?? "",
          description: r.description ?? "",
          highlights: r.highlights ?? [],
          details: r.details ?? [],
          included: r.included ?? [],
          excluded: r.excluded ?? [],
        };
        summary.perLang[lang] = (summary.perLang[lang] ?? 0) + 1;
      }

      const { error: updErr } = await supabase
        .from("tours")
        .update({ translations: next })
        .eq("id", t.id);

      if (updErr) {
        summary.failed++;
        errors.push(`${t.name}: ${updErr.message}`);
      } else {
        summary.translated++;
      }
    } catch (err) {
      summary.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${t.name}: ${msg}`);
    }
  }

  return NextResponse.json({ success: true, summary, errors });
}
