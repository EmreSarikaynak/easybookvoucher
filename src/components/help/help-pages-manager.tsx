"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createHelpPage,
  deleteHelpPage,
  listAllHelpPages,
  updateHelpPage,
  type HelpPageInput,
} from "@/app/actions/help-pages";
import type { HelpSection } from "@/lib/help/types";

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
import { DEFAULT_HELP_CATEGORIES } from "@/lib/help/default-pages";

const EMPTY_SECTION: HelpSection = {
  title: "",
  paragraphs: [""],
};

function rowToInput(row: HelpPageRow): HelpPageInput {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    sections: row.sections?.length ? row.sections : [EMPTY_SECTION],
    sortOrder: row.sort_order,
    showInFooter: row.show_in_footer,
    footerGroup: row.footer_group,
    isPublished: row.is_published,
  };
}

const defaultInput = (): HelpPageInput => ({
  slug: "",
  title: "",
  category: "Genel",
  summary: "",
  sections: [{ ...EMPTY_SECTION, paragraphs: [""] }],
  sortOrder: 100,
  showInFooter: false,
  footerGroup: null,
  isPublished: true,
});

export function HelpPagesManager() {
  const [pages, setPages] = useState<HelpPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HelpPageInput>(defaultInput());
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    const data = await listAllHelpPages();
    setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startCreate = () => {
    setEditingId("new");
    setForm(defaultInput());
    setMessage(null);
  };

  const startEdit = (row: HelpPageRow) => {
    setEditingId(row.id);
    setForm(rowToInput(row));
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(defaultInput());
    setMessage(null);
  };

  const updateSection = (index: number, patch: Partial<HelpSection>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res =
      editingId === "new"
        ? await createHelpPage(form)
        : editingId
          ? await updateHelpPage(editingId, form)
          : { success: false, error: "Düzenleme seçilmedi" };

    if (res.success) {
      setMessage("✅ Kaydedildi");
      cancelEdit();
      startTransition(() => {
        refresh();
      });
    } else {
      setMessage(`❌ ${res.error ?? "Kayıt başarısız"}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" sayfasını silmek istediğinize emin misiniz?`)) {
      return;
    }
    const res = await deleteHelpPage(id);
    if (res.success) {
      startTransition(() => refresh());
    } else {
      setMessage(`❌ ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Rehber sayfaları
            </CardTitle>
            <CardDescription>
              Footer ve /help altındaki tüm rehber içerikleri buradan yönetilir.
              Acenteler yalnızca okuyabilir.
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Yeni sayfa
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor…</p>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz sayfa yok. Supabase migration seed&apos;ini çalıştırın veya
              yeni sayfa ekleyin.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {pages.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-muted-foreground text-xs">
                      /help/{p.slug}
                      {!p.is_published && " · Taslak"}
                      {p.show_in_footer &&
                        ` · Footer (${p.footer_group === "featured" ? "öne çıkan" : "hızlı"})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.is_published && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/help/${p.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(p.id, p.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId === "new" ? "Yeni sayfa" : "Sayfayı düzenle"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hp-slug">URL slug</Label>
                <Input
                  id="hp-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="bilet-islemleri"
                  disabled={editingId !== "new"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hp-title">Başlık</Label>
                <Input
                  id="hp-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_HELP_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hp-sort">Sıra</Label>
                <Input
                  id="hp-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hp-summary">Özet</Label>
              <Textarea
                id="hp-summary"
                rows={2}
                value={form.summary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, summary: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isPublished: e.target.checked }))
                  }
                />
                Yayında
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.showInFooter}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      showInFooter: e.target.checked,
                      footerGroup: e.target.checked
                        ? f.footerGroup ?? "quick"
                        : null,
                    }))
                  }
                />
                Footer&apos;da göster
              </label>
              {form.showInFooter && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm shrink-0">Footer grubu</Label>
                  <Select
                    value={form.footerGroup ?? "quick"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        footerGroup: v as "featured" | "quick",
                      }))
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Öne çıkan</SelectItem>
                      <SelectItem value="quick">Hızlı bağlantı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Bölümler</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      sections: [
                        ...f.sections,
                        { title: "", paragraphs: [""] },
                      ],
                    }))
                  }
                >
                  Bölüm ekle
                </Button>
              </div>
              {form.sections.map((section, si) => (
                <div
                  key={si}
                  className="rounded-lg border p-4 space-y-3 bg-muted/20"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="Bölüm başlığı"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(si, { title: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={form.sections.length <= 1}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          sections: f.sections.filter((_, i) => i !== si),
                        }))
                      }
                    >
                      Sil
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paragraflar (her satır bir paragraf)"
                    rows={4}
                    value={section.paragraphs.join("\n")}
                    onChange={(e) =>
                      updateSection(si, {
                        paragraphs: e.target.value.split("\n"),
                      })
                    }
                  />
                  <Textarea
                    placeholder="İpuçları (isteğe bağlı, her satır bir ipucu)"
                    rows={2}
                    value={(section.tips ?? []).join("\n")}
                    onChange={(e) =>
                      updateSection(si, {
                        tips: e.target.value
                          ? e.target.value.split("\n")
                          : undefined,
                      })
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!!section.adminOnly}
                      onChange={(e) =>
                        updateSection(si, {
                          adminOnly: e.target.checked || undefined,
                        })
                      }
                    />
                    Yalnızca admin içeriği
                  </label>
                </div>
              ))}
            </div>

            {message && <p className="text-sm">{message}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
