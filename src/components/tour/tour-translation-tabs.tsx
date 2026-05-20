"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  type TourLang,
  type TourTranslations,
} from "@/lib/tour-i18n";

interface TourTranslationTabsProps {
  translations: TourTranslations;
  onChange: (translations: TourTranslations) => void;
}

export function TourTranslationTabs({ translations, onChange }: TourTranslationTabsProps) {
  const updateLang = (lang: TourLang, field: "name" | "description", value: string) => {
    onChange({
      ...translations,
      [lang]: {
        ...(translations[lang] ?? { name: "", description: "", highlights: [] }),
        [field]: value,
      },
    });
  };

  const addHighlight = (lang: TourLang) => {
    const current = translations[lang] ?? { name: "", description: "", highlights: [] };
    onChange({
      ...translations,
      [lang]: { ...current, highlights: [...(current.highlights ?? []), ""] },
    });
  };

  const updateHighlight = (lang: TourLang, index: number, value: string) => {
    const current = translations[lang] ?? { name: "", description: "", highlights: [] };
    const highlights = [...(current.highlights ?? [])];
    highlights[index] = value;
    onChange({ ...translations, [lang]: { ...current, highlights } });
  };

  const removeHighlight = (lang: TourLang, index: number) => {
    const current = translations[lang] ?? { name: "", description: "", highlights: [] };
    onChange({
      ...translations,
      [lang]: {
        ...current,
        highlights: (current.highlights ?? []).filter((_, i) => i !== index),
      },
    });
  };

  return (
    <Tabs defaultValue="tr" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        {TOUR_LANGUAGES.map((lang) => (
          <TabsTrigger key={lang} value={lang} className="text-xs sm:text-sm">
            {TOUR_LANG_FLAGS[lang]} {TOUR_LANG_LABELS[lang]}
          </TabsTrigger>
        ))}
      </TabsList>
      {TOUR_LANGUAGES.map((lang) => {
        const t = translations[lang] ?? { name: "", description: "", highlights: [] };
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Program / Öne Çıkanlar</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addHighlight(lang)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Madde Ekle
                </Button>
              </div>
              {(t.highlights ?? []).map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateHighlight(lang, index, e.target.value)}
                    placeholder={`Madde ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHighlight(lang, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
