"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Download,
  BookOpen,
  MessageCircle,
  Languages,
  Image as ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
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
  uploadCatalogPageBackground,
  deleteCatalogPageBackground,
  type CatalogCurrency,
  type CatalogPageData,
  type CatalogTourLayoutEntry,
} from "@/app/actions/tour-catalog";
import {
  CATALOG_LANGUAGES,
  TOUR_LANG_FLAGS,
  TOUR_LANG_LABELS,
  getTourContentForLang,
  type CatalogLang,
} from "@/lib/tour-i18n";
import { convertImageFileToJpeg } from "@/lib/image-client";
import type {
  CatalogTourInput,
  CatalogPriceInput,
} from "@/lib/tour-catalog-pdf";
import { CatalogTourLayoutPanel } from "@/components/tour/catalog-tour-layout-panel";

interface TourCatalogClientProps {
  initialData: CatalogPageData;
}

export function TourCatalogClient({ initialData }: TourCatalogClientProps) {
  const router = useRouter();
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

  const [pageBackgrounds, setPageBackgrounds] = useState<Record<number, string>>(
    initialData.pageBackgrounds ?? {}
  );
  const [tourLayout, setTourLayout] = useState<
    Record<string, CatalogTourLayoutEntry>
  >(initialData.tourLayout ?? {});
  const [uploadingPage, setUploadingPage] = useState<number | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const previewSeqRef = useRef(0);

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

  const selectedAgencyId = initialData.selectedAgencyId;
  const currency = initialData.currency;

  const buildHref = (params: { agencyId?: string | null; currency?: CatalogCurrency }) => {
    const next = new URLSearchParams();
    const ag = params.agencyId ?? selectedAgencyId;
    const cur = params.currency ?? currency;
    if (ag) next.set("agencyId", ag);
    if (cur) next.set("currency", cur);
    return `/tours/catalog?${next.toString()}`;
  };

  const handleAgencyChange = (agencyId: string) => {
    router.push(buildHref({ agencyId }));
  };

  const handleCurrencyChange = (next: CatalogCurrency) => {
    if (next === currency) return;
    router.push(buildHref({ currency: next }));
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

    setSendingWa(true);
    setWaMessage(null);
    try {
      const dsRes = await fetch(
        `/api/tours/catalog/dataset?agencyId=${encodeURIComponent(selectedAgencyId)}&currency=${currency}`
      );
      if (!dsRes.ok) {
        const body = (await dsRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Veri alınamadı (${dsRes.status})`);
      }
      const dataset = (await dsRes.json()) as {
        tours: CatalogTourInput[];
        prices: CatalogPriceInput[];
        agencyName: string;
        logoUrl?: string | null;
        pageBackgrounds?: Record<number, string>;
      };
      const { generateTourCatalogPdfBlob } = await import(
        "@/lib/tour-catalog-pdf"
      );
      const pdfBlob = await generateTourCatalogPdfBlob({
        tours: dataset.tours,
        prices: dataset.prices,
        lang: whatsappLang,
        agencyName: dataset.agencyName,
        logoUrl: dataset.logoUrl ?? null,
        currency,
        baseUrl: window.location.origin,
        pageBackgrounds: dataset.pageBackgrounds ?? {},
      });

      const form = new FormData();
      form.append("pdf", pdfBlob, "katalog.pdf");
      form.append("phone", customerPhone.trim());
      form.append("lang", whatsappLang);
      form.append("agencyId", selectedAgencyId);
      form.append("agencyName", dataset.agencyName);
      form.append("currency", currency);

      const res = await fetch("/api/tours/catalog/send-whatsapp", {
        method: "POST",
        body: form,
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
    setDownloading(lang);
    setError(null);
    try {
      const dsRes = await fetch(
        `/api/tours/catalog/dataset?agencyId=${encodeURIComponent(selectedAgencyId)}&currency=${currency}`
      );
      if (!dsRes.ok) {
        const body = (await dsRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Veri alınamadı (${dsRes.status})`);
      }
      const dataset = (await dsRes.json()) as {
        tours: CatalogTourInput[];
        prices: CatalogPriceInput[];
        agencyName: string;
        logoUrl?: string | null;
        pageBackgrounds?: Record<number, string>;
      };

      const { generateTourCatalogPdfBlob } = await import(
        "@/lib/tour-catalog-pdf"
      );
      const blob = await generateTourCatalogPdfBlob({
        tours: dataset.tours,
        prices: dataset.prices,
        lang,
        agencyName: dataset.agencyName,
        logoUrl: dataset.logoUrl ?? null,
        currency,
        baseUrl: window.location.origin,
        pageBackgrounds: dataset.pageBackgrounds ?? {},
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const agencySlug =
        initialData.selectedAgencyName?.replace(/\s+/g, "-") ?? "katalog";
      a.download = `tur-katalogu-${agencySlug}-${currency.toLowerCase()}-${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF indirilemedi");
    } finally {
      setDownloading(null);
    }
  };

  const sortedTours = useMemo(
    () => [...initialData.tours].sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [initialData.tours]
  );

  // Layout-aware tur sıralaması: admin layout'a göre atanmış turlar önce,
  // atanmamışlar alfabetik sırayla sona eklenir. Layout boşsa alfabetik.
  const orderedTours = useMemo(() => {
    const layoutEntries = Object.keys(tourLayout);
    if (layoutEntries.length === 0) return sortedTours;

    const assigned = initialData.tours
      .filter((t) => tourLayout[t.id])
      .sort((a, b) => {
        const A = tourLayout[a.id];
        const B = tourLayout[b.id];
        return A.page_number - B.page_number || A.slot - B.slot;
      });
    const unassigned = initialData.tours
      .filter((t) => !tourLayout[t.id])
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return [...assigned, ...unassigned];
  }, [initialData.tours, sortedTours, tourLayout]);

  // Sayfa pozisyonu bazlı tur eşlemesi (her sayfa = 2 tur).
  // 1: Kapak, 2..N: Tur sayfaları (2 -> ilk 2 tur, 3 -> sonraki 2 tur, …)
  const pageLayout = useMemo(() => {
    const tourPagesCount = Math.ceil(orderedTours.length / 2);
    const items: { pageNumber: number; label: string; subLabel?: string }[] = [
      { pageNumber: 1, label: "Sayfa 1 — Kapak" },
    ];
    for (let i = 0; i < tourPagesCount; i++) {
      const a = orderedTours[i * 2];
      const b = orderedTours[i * 2 + 1];
      const aName = a ? getTourContentForLang(a.translations, previewLang, a.name, a.description).name : "";
      const bName = b ? getTourContentForLang(b.translations, previewLang, b.name, b.description).name : "";
      const label = `Sayfa ${2 + i}`;
      const subLabel = b ? `${aName} + ${bName}` : aName;
      items.push({ pageNumber: 2 + i, label, subLabel });
    }
    return items;
  }, [orderedTours, previewLang]);

  // PDF önizleme — pageBackgrounds, previewLang, currency, selectedAgencyId değişince yeniden üret.
  useEffect(() => {
    if (!selectedAgencyId) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }
    const seq = ++previewSeqRef.current;
    let cancelled = false;
    setPreviewBusy(true);
    setPreviewError(null);

    const run = async () => {
      try {
        const dsRes = await fetch(
          `/api/tours/catalog/dataset?agencyId=${encodeURIComponent(selectedAgencyId)}&currency=${currency}`
        );
        if (!dsRes.ok) {
          const body = (await dsRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || `Veri alınamadı (${dsRes.status})`);
        }
        const dataset = (await dsRes.json()) as {
          tours: CatalogTourInput[];
          prices: CatalogPriceInput[];
          agencyName: string;
          logoUrl?: string | null;
          pageBackgrounds?: Record<number, string>;
        };

        const { generateTourCatalogPdfBlob } = await import(
          "@/lib/tour-catalog-pdf"
        );

        // En güncel state'teki pageBackgrounds'u kullan (dataset'inkini ezer).
        const blob = await generateTourCatalogPdfBlob({
          tours: dataset.tours,
          prices: dataset.prices,
          lang: previewLang,
          agencyName: dataset.agencyName,
          logoUrl: dataset.logoUrl ?? null,
          currency,
          baseUrl: window.location.origin,
          pageBackgrounds,
        });

        if (cancelled || seq !== previewSeqRef.current) return;

        const url = URL.createObjectURL(blob);
        if (previewObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        previewObjectUrlRef.current = url;
        setPreviewUrl(url);
      } catch (e) {
        if (!cancelled && seq === previewSeqRef.current) {
          setPreviewError(e instanceof Error ? e.message : "Önizleme oluşturulamadı");
        }
      } finally {
        if (!cancelled && seq === previewSeqRef.current) {
          setPreviewBusy(false);
        }
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [selectedAgencyId, previewLang, currency, pageBackgrounds, tourLayout]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const handlePageBgUpload = async (pageNumber: number, file: File) => {
    setUploadingPage(pageNumber);
    setBgError(null);
    try {
      const jpeg = await convertImageFileToJpeg(file);
      const fd = new FormData();
      fd.append("file", jpeg);
      const res = await uploadCatalogPageBackground(pageNumber, fd);
      if (res.error || !res.url) {
        setBgError(res.error || "Arkaplan yüklenemedi");
        return;
      }
      setPageBackgrounds((prev) => ({ ...prev, [pageNumber]: res.url! }));
    } catch (e) {
      setBgError(e instanceof Error ? e.message : "Arkaplan yüklenemedi");
    } finally {
      setUploadingPage(null);
    }
  };

  const handlePageBgDelete = async (pageNumber: number) => {
    if (!confirm(`Sayfa ${pageNumber} arkaplanı kaldırılsın mı?`)) return;
    setUploadingPage(pageNumber);
    setBgError(null);
    try {
      const res = await deleteCatalogPageBackground(pageNumber);
      if (res.error) {
        setBgError(res.error);
        return;
      }
      setPageBackgrounds((prev) => {
        const next = { ...prev };
        delete next[pageNumber];
        return next;
      });
    } finally {
      setUploadingPage(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Tur Kataloğu
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-xl">
            {initialData.isAdmin
              ? `Tüm aktif turlar için ${currency} satış fiyatlarını girin, önizleyin, PDF indirin veya müşteriye WhatsApp ile katalog gönderin.`
              : "Aktif turları önizleyin, PDF indirin veya müşteriye WhatsApp ile katalog gönderin."}
          </p>
          <div className="mt-3 inline-flex rounded-md border bg-white p-0.5 text-sm">
            <button
              type="button"
              onClick={() => handleCurrencyChange("EUR")}
              className={`px-3 py-1 rounded ${currency === "EUR" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              EUR €
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange("TRY")}
              className={`px-3 py-1 rounded ${currency === "TRY" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              TRY ₺
            </button>
          </div>
        </div>

        <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {CATALOG_LANGUAGES.map((lang) => (
              <Button
                key={lang}
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:h-9 sm:px-3"
                disabled={!selectedAgencyId || downloading !== null}
                onClick={() => handleDownload(lang)}
              >
                {downloading === lang ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-1.5 sm:h-4 sm:w-4" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
                )}
                <span className="mr-1">{TOUR_LANG_FLAGS[lang]}</span>
                <span className="text-xs font-semibold uppercase sm:hidden">
                  {lang}
                </span>
                <span className="hidden sm:inline">
                  {TOUR_LANG_LABELS[lang]} PDF
                </span>
              </Button>
            ))}
          </div>
          {initialData.isAdmin && (
            <>
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
                {bulkTranslating
                  ? "Çevriliyor… (30sn)"
                  : "Tüm Boş Çevirileri Doldur"}
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
            </>
          )}
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={
                sendingWa ||
                !selectedAgencyId ||
                !customerPhone.trim()
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

      {initialData.isAdmin && (
        <CatalogTourLayoutPanel
          tours={initialData.tours}
          initialLayout={tourLayout}
          previewLang={previewLang}
          onSaved={(next) => setTourLayout(next)}
        />
      )}

      {/* Katalog Önizleme (PDF birebir) + Admin sayfa arkaplan paneli */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Katalog Önizleme</h2>
          <div className="flex flex-wrap gap-2">
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

        <div
          className={`grid gap-4 ${
            initialData.isAdmin ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1"
          }`}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative bg-slate-100">
              {previewBusy && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 pointer-events-none">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {previewError ? (
                <div className="p-6 text-sm text-destructive">{previewError}</div>
              ) : previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title="Katalog Önizleme"
                  className="w-full h-[900px] border-0 bg-white"
                />
              ) : !selectedAgencyId ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Önizleme için acente seçin.
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Önizleme yükleniyor…
                </div>
              )}
            </CardContent>
          </Card>

          {initialData.isAdmin && (
            <Card className="lg:sticky lg:top-4 self-start max-h-[900px] overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Sayfa Arkaplanları
                </CardTitle>
                <CardDescription>
                  Her sayfa için A4 arkaplan görseli. Tüm acentelerin PDF&apos;lerinde
                  aynı arkaplan kullanılır.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 space-y-3">
                {bgError && (
                  <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                    {bgError}
                  </div>
                )}
                {pageLayout.map((p) => {
                  const url = pageBackgrounds[p.pageNumber];
                  const busy = uploadingPage === p.pageNumber;
                  return (
                    <div
                      key={p.pageNumber}
                      className="rounded-md border bg-white p-2.5 space-y-2"
                    >
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {p.label}
                        </p>
                        {p.subLabel && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {p.subLabel}
                          </p>
                        )}
                      </div>
                      <div className="relative w-full aspect-[1/1.414] rounded border bg-slate-100 overflow-hidden">
                        {url ? (
                          <Image
                            src={url}
                            alt={p.label}
                            fill
                            className="object-cover"
                            sizes="200px"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {busy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <label className="flex-1">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={busy}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) await handlePageBgUpload(p.pageNumber, f);
                            }}
                          />
                          <span
                            className={`flex items-center justify-center gap-1 h-8 rounded text-xs font-medium border cursor-pointer w-full ${
                              busy
                                ? "opacity-50 cursor-not-allowed"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {url ? "Değiştir" : "Yükle"}
                          </span>
                        </label>
                        {url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={busy}
                            onClick={() => handlePageBgDelete(p.pageNumber)}
                            title="Arkaplanı kaldır"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
