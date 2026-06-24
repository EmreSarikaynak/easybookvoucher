"use client";

import { useState } from "react";
import { Plus, X, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  emptyTourTranslation,
  type TourLang,
  type TourTranslationContent,
  type TourTranslations,
} from "@/lib/tour-i18n";

interface TourTranslationTabsProps {
  translations: TourTranslations;
  onChange: (translations: TourTranslations) => void;
}

type ListField = "highlights" | "details" | "included" | "excluded";

const LIST_FIELD_LABELS: Record<ListField, { tr: string; addBtn: string }> = {
  highlights: { tr: "Program / Öne Çıkanlar", addBtn: "Madde Ekle" },
  details: { tr: "Tur Detayları (PDF kataloğu)", addBtn: "Madde Ekle" },
  included: { tr: "Dahil Olanlar (PDF kataloğu)", addBtn: "Madde Ekle" },
  excluded: { tr: "Dahil Olmayanlar (PDF kataloğu)", addBtn: "Madde Ekle" },
};

export function TourTranslationTabs({ translations, onChange }: TourTranslationTabsProps) {
  const [translating, setTranslating] = useState(false);

  const getLang = (lang: TourLang): TourTranslationContent =>
    translations[lang] ?? emptyTourTranslation();

  const translateFromTr = async () => {
    const tr = getLang("tr");
    if (!tr.name.trim() && !tr.description.trim()) {
      alert("Önce TR sekmesinde en az ad veya açıklamayı doldur.");
      return;
    }
    if (
      !confirm(
        "EN / RU / PL sekmelerindeki tüm alanları TR'den çevirip ÜZERİNE YAZILACAK. Devam edilsin mi?"
      )
    ) {
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "tr",
          targets: ["en", "ru", "pl"],
          bundle: {
            name: tr.name,
            description: tr.description,
            highlights: tr.highlights ?? [],
            details: tr.details ?? [],
            included: tr.included ?? [],
            excluded: tr.excluded ?? [],
          },
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        results?: Record<string, Partial<TourTranslationContent>>;
        error?: string;
      };
      if (!res.ok || !data.success || !data.results) {
        alert(`Çeviri hatası: ${data.error ?? res.statusText}`);
        return;
      }
      const updated: TourTranslations = { ...translations };
      for (const lang of ["en", "ru", "pl"] as TourLang[]) {
        const r = data.results[lang];
        if (!r) continue;
        updated[lang] = {
          name: r.name ?? "",
          description: r.description ?? "",
          highlights: r.highlights ?? [],
          details: r.details ?? [],
          included: r.included ?? [],
          excluded: r.excluded ?? [],
        };
      }
      onChange(updated);
    } catch (err) {
      console.error(err);
      alert("Çeviri başarısız (ağ hatası).");
    } finally {
      setTranslating(false);
    }
  };

  const updateLang = (lang: TourLang, field: "name" | "description", value: string) => {
    onChange({
      ...translations,
      [lang]: { ...getLang(lang), [field]: value },
    });
  };

  const addItem = (lang: TourLang, field: ListField) => {
    const current = getLang(lang);
    onChange({
      ...translations,
      [lang]: { ...current, [field]: [...(current[field] ?? []), ""] },
    });
  };

  const updateItem = (lang: TourLang, field: ListField, index: number, value: string) => {
    const current = getLang(lang);
    const list = [...(current[field] ?? [])];
    list[index] = value;
    onChange({ ...translations, [lang]: { ...current, [field]: list } });
  };

  const removeItem = (lang: TourLang, field: ListField, index: number) => {
    const current = getLang(lang);
    onChange({
      ...translations,
      [lang]: {
        ...current,
        [field]: (current[field] ?? []).filter((_, i) => i !== index),
      },
    });
  };

  return (
    <Tabs defaultValue="tr" className="w-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <TabsList className="grid grid-cols-4 flex-1">
          {TOUR_LANGUAGES.map((lang) => (
            <TabsTrigger key={lang} value={lang} className="text-xs sm:text-sm">
              {TOUR_LANG_FLAGS[lang]} {TOUR_LANG_LABELS[lang]}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={translateFromTr}
          disabled={translating}
          title="TR sekmesindeki tüm içeriği DeepL ile EN/RU/PL'ye çevirir"
        >
          {translating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Languages className="h-3 w-3 mr-1" />
          )}
          {translating ? "Çevriliyor..." : "TR'den çevir"}
        </Button>
      </div>
      {TOUR_LANGUAGES.map((lang) => {
        const t = getLang(lang);
        return (
          <TabsContent key={lang} value={lang} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${lang}`}>
                Tur Adı ({TOUR_LANG_LABELS[lang]}){lang === "tr" ? " *" : ""}
              </Label>
              <Input
                id={`name-${lang}`}
                value={t.name}
                onChange={(e) => updateLang(lang, "name", e.target.value)}
                placeholder={`Tur adı — ${TOUR_LANG_LABELS[lang]}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`desc-${lang}`}>Açıklama</Label>
              <textarea
                id={`desc-${lang}`}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={t.description}
                onChange={(e) => updateLang(lang, "description", e.target.value)}
                placeholder="Tur açıklaması..."
              />
            </div>

            {(["highlights", "details", "included", "excluded"] as ListField[]).map((field) => (
              <div key={field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{LIST_FIELD_LABELS[field].tr}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(lang, field)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {LIST_FIELD_LABELS[field].addBtn}
                  </Button>
                </div>
                {(t[field] ?? []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateItem(lang, field, index, e.target.value)}
                      placeholder={`Madde ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(lang, field, index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
