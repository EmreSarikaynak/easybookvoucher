"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Download,
  BookOpen,
  ImageIcon,
  Euro,
  MessageCircle,
  Languages,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveCatalogPrices,
  type CatalogPageData,
} from "@/app/actions/tour-catalog";
import {
  CATALOG_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  getCatalogPageUi,
  getTourContentForLang,
  type CatalogLang,
} from "@/lib/tour-i18n";
import type { Tour } from "@/lib/types";

interface PriceDraft {
  price_adult: number;
  price_child: number;
  dirty: boolean;
}

interface TourCatalogClientProps {
  initialData: CatalogPageData;
}

export function TourCatalogClient({ initialData }: TourCatalogClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<CatalogLang>("tr");
  const [whatsappLang, setWhatsappLang] = useState<CatalogLang>("tr");
  const [customerPhone, setCustomerPhone] = useState("");
  const [downloading, setDownloading] = useState<CatalogLang | null>(null);
  const [sendingWa, setSendingWa] = useState(false);
  const [waMessage, setWaMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleBulkTranslate = useCallback(async () => {
    if (
      !confirm(
        "Tüm aktif turlar taranır. TR'si dolu ama EN/RU/PL'si tamamen boş olan diller DeepL ile doldurulur. Devam edilsin mi?"
      )
    ) {
      return;
    }
    setBulkTranslating(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/translate/bulk-tours", { method: "POST" });
      const data = (await res.json()) as {
        success?: boolean;
        summary?: {
          total: number;
          translated: number;
          skipped: number;
          failed: number;
          perLang: Record<string, number>;
        };
        errors?: string[];
        error?: string;
      };
      if (!res.ok || !data.success || !data.summary) {
        setBulkResult({
          type: "error",
          text: `Çeviri hatası: ${data.error ?? res.statusText}`,
        });
        return;
      }
      const s = data.summary;
      const perLang = `EN: ${s.perLang.en ?? 0} · RU: ${s.perLang.ru ?? 0} · PL: ${s.perLang.pl ?? 0}`;
      setBulkResult({
        type: s.failed > 0 ? "error" : "success",
        text: `Tarandı: ${s.total} tur · Çevrildi: ${s.translated} · Atlandı: ${s.skipped} · Hata: ${s.failed}\n${perLang}`,
      });
      // Sayfayı yenile ki yeni çeviriler önizleme tablosunda görünsün
      router.refresh();
    } catch (err) {
      setBulkResult({
        type: "error",
        text: err instanceof Error ? err.message : "Ağ hatası",
      });
    } finally {
      setBulkTranslating(false);
    }
  }, [router]);

  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>(() => {
    const init: Record<string, PriceDraft> = {};
    initialData.prices.forEach((p) => {
      init[p.tour_id] = {
        price_adult: p.price_adult,
        price_child: p.price_child,
        dirty: false,
      };
    });
    return init;
  });

  const selectedAgencyId = initialData.selectedAgencyId;

  const handleAgencyChange = (agencyId: string) => {
    router.push(`/tours/catalog?agencyId=${encodeURIComponent(agencyId)}`);
  };

  const updateField = (
    tourId: string,
    field: "price_adult" | "price_child",
    raw: string
  ) => {
    const num = parseInt(raw, 10);
    setDrafts((prev) => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        [field]: Number.isNaN(num) ? 0 : num,
        dirty: true,
      },
    }));
  };

  const dirtyCount = Object.values(drafts).filter((d) => d.dirty).length;

  const handleSave = async () => {
    if (!selectedAgencyId) {
      setError("Kayıt için acente seçin");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const rows = initialData.tours.map((t) => ({
        tour_id: t.id,
        price_adult: drafts[t.id]?.price_adult ?? 0,
        price_child: drafts[t.id]?.price_child ?? 0,
      }));
      const result = await saveCatalogPrices(selectedAgencyId, rows);
      if (result.error) {
        setError(result.error);
      } else {
        setDrafts((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            next[id] = { ...next[id], dirty: false };
          }
          return next;
        });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedAgencyId) {
      setWaMessage({ type: "error", text: "Acente seçin" });
      return;
    }
    if (!customerPhone.trim()) {
      setWaMessage({ type: "error", text: "Müşteri telefonu girin" });
      return;
    }
    if (dirtyCount > 0) {
      setWaMessage({
        type: "error",
        text: "Kaydedilmemiş fiyatlar var. Önce Kaydet'e basın.",
      });
      return;
    }

    setSendingWa(true);
    setWaMessage(null);
    try {
      const res = await fetch("/api/tours/catalog/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customerPhone.trim(),
          lang: whatsappLang,
          agencyId: selectedAgencyId,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setWaMessage({
          type: "error",
          text: data.error || "WhatsApp gönderilemedi",
        });
      } else {
        setWaMessage({
          type: "success",
          text: "Katalog PDF müşteriye WhatsApp ile gönderildi ✓",
        });
        setTimeout(() => setWaMessage(null), 6000);
      }
    } catch {
      setWaMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSendingWa(false);
    }
  };

  const handleDownload = async (lang: CatalogLang) => {
    if (!selectedAgencyId) {
      setError("PDF için acente seçin");
      return;
    }
    if (dirtyCount > 0) {
      setError("Kaydedilmemiş fiyatlar var. Önce Kaydet'e basın.");
      return;
    }
    setDownloading(lang);
    setError(null);
    try {
      const url = `/api/tours/catalog/pdf?lang=${lang}&agencyId=${encodeURIComponent(selectedAgencyId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `İndirme başarısız (${res.status})`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const agencySlug =
        initialData.selectedAgencyName?.replace(/\s+/g, "-") ?? "katalog";
      a.download = `tur-katalogu-${agencySlug}-${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF indirilemedi");
    } finally {
      setDownloading(null);
    }
  };

  const getPriceForTour = useCallback(
    (tourId: string) => {
      const d = drafts[tourId];
      return {
        adult: d?.price_adult ?? 0,
        child: d?.price_child ?? 0,
      };
    },
    [drafts]
  );

  const catalogUi = getCatalogPageUi(previewLang);

  const sortedTours = useMemo(
    () => [...initialData.tours].sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [initialData.tours]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Tur Kataloğu
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Tüm aktif turlar için EUR satış fiyatlarını girin, önizleyin, PDF
            indirin veya müşteriye WhatsApp ile katalog gönderin.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {CATALOG_LANGUAGES.map((lang) => (
              <Button
                key={lang}
                variant="outline"
                size="sm"
                disabled={!selectedAgencyId || downloading !== null}
                onClick={() => handleDownload(lang)}
              >
                {downloading === lang ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                <span className="mr-1">{TOUR_LANG_FLAGS[lang]}</span>
                {TOUR_LANG_LABELS[lang]} PDF
              </Button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkTranslating}
            onClick={handleBulkTranslate}
            title="Tüm aktif turlarda TR doluysa boş EN/RU/PL alanlarını DeepL ile doldur"
          >
            {bulkTranslating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Languages className="mr-1.5 h-4 w-4" />
            )}
            {bulkTranslating ? "Çevriliyor… (30sn)" : "Tüm Boş Çevirileri Doldur"}
          </Button>
          {bulkResult ? (
            <div
              className={`text-xs whitespace-pre-line max-w-xs rounded border px-2 py-1.5 ${
                bulkResult.type === "success"
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-red-300 bg-red-50 text-red-800"
              }`}
            >
              {bulkResult.text}
            </div>
          ) : null}
        </div>
      </div>

      {initialData.isAdmin && initialData.agencies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acente</CardTitle>
            <CardDescription>
              Fiyatları düzenleyeceğiniz acenteyi seçin. PDF indirirken bu
              acentenin fiyatları kullanılır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAgencyId ?? undefined}
              onValueChange={handleAgencyChange}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Acente seçin" />
              </SelectTrigger>
              <SelectContent>
                {initialData.agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {!selectedAgencyId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          PDF ve fiyat kaydı için bir acente tanımlı olmalıdır.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-700" />
            Müşteriye WhatsApp Gönder
          </CardTitle>
          <CardDescription>
            Kayıtlı fiyatlarla katalog PDF oluşturulur ve seçtiğiniz dilde
            müşterinin WhatsApp numarasına link olarak iletilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Müşteri telefonu</label>
              <PhoneInput
                value={customerPhone}
                onChange={setCustomerPhone}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mesaj dili</label>
              <Select
                value={whatsappLang}
                onValueChange={(v) => setWhatsappLang(v as CatalogLang)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {TOUR_LANG_FLAGS[lang]} {TOUR_LANG_LABELS[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {dirtyCount > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Göndermeden önce fiyat değişikliklerini kaydedin ({dirtyCount}{" "}
              tur bekliyor).
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={
                sendingWa ||
                !selectedAgencyId ||
                !customerPhone.trim() ||
                dirtyCount > 0
              }
              onClick={handleSendWhatsApp}
            >
              {sendingWa ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              Kataloğu WhatsApp ile Gönder
            </Button>
          </div>

          {waMessage && (
            <p
              className={`text-sm ${
                waMessage.type === "success"
                  ? "text-green-700"
                  : "text-destructive"
              }`}
            >
              {waMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Satış Fiyatları (EUR)
            </CardTitle>
            {initialData.selectedAgencyName && (
              <CardDescription>{initialData.selectedAgencyName}</CardDescription>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedAgencyId || dirtyCount === 0}
            size="sm"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Kaydet
            {dirtyCount > 0 ? ` (${dirtyCount})` : ""}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Tur</TableHead>
                <TableHead className="text-right w-28">Yetişkin €</TableHead>
                <TableHead className="text-right w-28">Çocuk €</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTours.map((tour) => (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">{tour.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="text-right h-9"
                      value={drafts[tour.id]?.price_adult ?? 0}
                      onChange={(e) =>
                        updateField(tour.id, "price_adult", e.target.value)
                      }
                      disabled={!selectedAgencyId}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="text-right h-9"
                      value={drafts[tour.id]?.price_child ?? 0}
                      onChange={(e) =>
                        updateField(tour.id, "price_child", e.target.value)
                      }
                      disabled={!selectedAgencyId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* HTML önizleme */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Katalog Önizleme</h2>
          <div className="flex gap-2">
            {CATALOG_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setPreviewLang(lang)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  previewLang === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {TOUR_LANG_FLAGS[lang]} {TOUR_LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sortedTours.map((tour) => (
            <CatalogPreviewCard
              key={tour.id}
              tour={tour}
              lang={previewLang}
              adult={getPriceForTour(tour.id).adult}
              child={getPriceForTour(tour.id).child}
              catalogUi={catalogUi}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CatalogPreviewCard({
  tour,
  lang,
  adult,
  child,
  catalogUi,
}: {
  tour: Tour;
  lang: CatalogLang;
  adult: number;
  child: number;
  catalogUi: ReturnType<typeof getCatalogPageUi>;
}) {
  const content = getTourContentForLang(
    tour.translations,
    lang,
    tour.name,
    tour.description
  );
  const cover = tour.images?.[0];

  return (
    <Card className="overflow-hidden flex flex-col h-full border shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200">
        {cover ? (
          <Image
            src={cover}
            alt={content.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-white font-bold text-sm leading-tight line-clamp-2">
            {content.name}
          </p>
        </div>
      </div>
      <CardContent className="flex-1 flex flex-col gap-2 p-4">
        {tour.duration && (
          <p className="text-xs text-muted-foreground">{tour.duration}</p>
        )}
        <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-sm">
          <span>
            <span className="text-muted-foreground text-xs block">
              {catalogUi.adultPrice}
            </span>
            <span className="font-bold text-primary">€{adult}</span>
          </span>
          <span>
            <span className="text-muted-foreground text-xs block">
              {catalogUi.childPrice}
            </span>
            <span className="font-bold text-primary">€{child}</span>
          </span>
        </div>
        {content.description && (
          <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
            {content.description}
          </p>
        )}
        {content.highlights?.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {content.highlights.slice(0, 2).map((h, i) =>
              h.trim() ? (
                <li key={i} className="line-clamp-1">
                  • {h}
                </li>
              ) : null
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
