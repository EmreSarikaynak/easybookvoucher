import { jsPDF } from "jspdf";
import {
  getTourContentForLang,
  getTourPageUi,
  type TourLang,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { EASYBOOK_CONTACT } from "@/lib/constants";
import type { ResolvedTourPriceSet } from "@/lib/tour-catalog-data";

export interface TourPdfInput {
  name: string;
  description: string | null;
  duration: string | null;
  pickup_locations: string[];
  images: string[];
  translations?: TourTranslations | null;
  tour_managers?: { name: string; phone: string }[];
  prices?: ResolvedTourPriceSet | null;
  agencyName?: string | null;
}

/**
 * jsPDF yalnızca JPEG/PNG gömebilir (Cloudflare Workers'da native dönüştürücü
 * yok). Görseli olduğu gibi getirir ve jsPDF formatını içerikten belirler;
 * desteklenmeyen format (webp vs.) için null döner → çağıran atlar.
 */
async function fetchImageForPdf(
  url: string
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    let format: "JPEG" | "PNG" | null = null;
    if (/jpe?g/.test(contentType)) format = "JPEG";
    else if (/png/.test(contentType)) format = "PNG";
    if (!format) return null; // webp vs. — jsPDF gömeMEZ
    const base64 = Buffer.from(buf).toString("base64");
    return { dataUrl: `data:${contentType};base64,${base64}`, format };
  } catch {
    return null;
  }
}

export async function generateTourPdfBuffer(
  tour: TourPdfInput,
  lang: TourLang
): Promise<Buffer> {
  const ui = getTourPageUi(lang);
  const content = getTourContentForLang(
    tour.translations,
    lang,
    tour.name,
    tour.description
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addLine = (text: string, size = 11, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    const lineH = size * 0.45;
    if (y + lines.length * lineH > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(lines, margin, y);
    y += lines.length * lineH + 3;
  };

  pdf.setFillColor(15, 76, 129);
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Easy Book Tours", margin, 12);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(ui.since, margin, 20);
  pdf.setTextColor(0, 0, 0);
  y = 36;

  addLine(content.name, 20, true);
  if (tour.duration) {
    addLine(`${ui.duration}: ${tour.duration}`, 10);
  }
  if (tour.prices) {
    y += 1;
    addLine("Fiyatlar", 12, true);
    if (tour.agencyName) addLine(tour.agencyName, 9);
    addLine(
      `EUR: Yetiskin ${tour.prices.eur.adult} EUR / Cocuk ${tour.prices.eur.child} EUR`,
      10
    );
    addLine(
      `TRY: Yetiskin ${tour.prices.try.adult} TRY / Cocuk ${tour.prices.try.child} TRY`,
      10
    );
  }

  if (content.description?.trim()) {
    y += 2;
    addLine(content.description, 10);
  }

  if (content.highlights?.length) {
    y += 2;
    addLine(ui.highlights, 12, true);
    for (const h of content.highlights) {
      if (h.trim()) addLine(`• ${h}`, 10);
    }
  }

  if (tour.pickup_locations?.length) {
    y += 2;
    addLine(ui.pickupLocations, 12, true);
    addLine(tour.pickup_locations.join(", "), 10);
  }

  // Yüklenen tüm fotoğrafları yan yana 2'li ızgarada bas
  const images = tour.images ?? [];
  if (images.length) {
    y += 2;
    const pageH = pdf.internal.pageSize.getHeight();
    const gap = 4;
    const cellW = (pageW - margin * 2 - gap) / 2; // 2 sütun
    const cellH = cellW * 0.66; // ~3:2 oran
    let col = 0;

    for (const img of images) {
      const fetched = await fetchImageForPdf(img);
      if (!fetched) continue;
      // Yeni satıra geçilecekse sayfa sonu kontrolü
      if (col === 0 && y + cellH > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
      const x = margin + col * (cellW + gap);
      try {
        pdf.addImage(fetched.dataUrl, fetched.format, x, y, cellW, cellH);
      } catch {
        /* skip broken image */
      }
      col += 1;
      if (col === 2) {
        col = 0;
        y += cellH + gap;
      }
    }
    // Tek kalan görsel varsa satır yüksekliğini ekle
    if (col === 1) y += cellH + gap;
    y += 2;
  }

  if (tour.tour_managers?.length) {
    y += 4;
    addLine(ui.tourManagers, 12, true);
    for (const m of tour.tour_managers) {
      if (m.name || m.phone) addLine(`${m.name} — ${m.phone}`, 10);
    }
  }

  y += 4;
  addLine(`${ui.contact}: ${EASYBOOK_CONTACT.phoneDisplay}`, 10);
  addLine(EASYBOOK_CONTACT.website, 10);

  const footerY = pdf.internal.pageSize.getHeight() - 10;
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text("www.easybooktours.com", margin, footerY);

  const arrayBuffer = pdf.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
