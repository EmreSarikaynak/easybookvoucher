import { jsPDF } from "jspdf";
import {
  getCatalogPageUi,
  getTourContentForLang,
  getTourPageUi,
  type CatalogLang,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { EASYBOOK_CONTACT } from "@/lib/constants";

export interface CatalogTourInput {
  id: string;
  name: string;
  description: string | null;
  duration: string | null;
  pickup_locations: string[];
  images: string[];
  translations?: TourTranslations | null;
  tour_managers?: { name: string; phone: string }[];
}

export interface CatalogPriceInput {
  tour_id: string;
  price_adult: number;
  price_child: number;
}

const BRAND_RGB = { r: 15, g: 76, b: 129 };
const HEADER_H = 22;
const FOOTER_Y_OFFSET = 12;
const CARD_H = 58;
const IMG_W = 32;
const IMG_H = 42;
const CARD_GAP = 6;

/** jsPDF Helvetica Turkce karakterleri desteklemez */
function pdfText(text: string): string {
  return text
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

function formatDurationLabel(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/_/g, " ").trim();
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function generateTourCatalogPdfBuffer(opts: {
  tours: CatalogTourInput[];
  prices: CatalogPriceInput[];
  lang: CatalogLang;
  agencyName?: string | null;
}): Promise<Buffer> {
  const { tours, prices, lang, agencyName } = opts;
  const catalogUi = getCatalogPageUi(lang);
  const tourUi = getTourPageUi(lang);
  const priceMap = new Map(prices.map((p) => [p.tour_id, p]));

  const imageCache = new Map<string, string | null>();
  await Promise.all(
    tours.map(async (t) => {
      const url = t.images?.[0];
      if (url) imageCache.set(t.id, await fetchImageAsDataUrl(url));
    })
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const textX = margin + IMG_W + 5;
  const textW = contentW - IMG_W - 5;
  let y = 0;
  let pageNum = 0;

  const drawCompactHeader = (subtitle?: string) => {
    pdf.setFillColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    pdf.rect(0, 0, pageW, HEADER_H, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Easy Book Tours", margin, 10);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const sub = pdfText(subtitle || catalogUi.tourCatalog);
    pdf.text(sub, margin, 16);
    if (agencyName) {
      pdf.text(pdfText(agencyName), pageW - margin, 16, { align: "right" });
    }
    pdf.setTextColor(0, 0, 0);
    y = HEADER_H + 8;
  };

  const drawFooter = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(140, 140, 140);
    pdf.text(EASYBOOK_CONTACT.website, margin, pageH - FOOTER_Y_OFFSET);
    pdf.text(
      `${pdfText(catalogUi.generatedOn)}: ${new Date().toLocaleDateString(
        lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-GB"
      )}`,
      pageW - margin,
      pageH - FOOTER_Y_OFFSET,
      { align: "right" }
    );
  };

  const newPage = (subtitle?: string) => {
    if (pageNum > 0) pdf.addPage();
    pageNum++;
    drawCompactHeader(subtitle);
    drawFooter();
  };

  const ensureSpace = (needed: number) => {
    const maxY = pageH - FOOTER_Y_OFFSET - 6;
    if (y + needed > maxY) {
      newPage(catalogUi.allTours);
    }
  };

  // Ilk sayfa: kapak ozeti + turlar baslar
  newPage(catalogUi.catalogTitle);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(pdfText(catalogUi.allTours), margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(90, 90, 90);
  const intro =
    lang === "tr"
      ? `${tours.length} tur | ${pdfText(catalogUi.pricesEur)} | ${EASYBOOK_CONTACT.phoneDisplay}`
      : lang === "ru"
        ? `${tours.length} туров | ${pdfText(catalogUi.pricesEur)}`
        : `${tours.length} tours | ${pdfText(catalogUi.pricesEur)}`;
  pdf.text(intro, margin, y);
  y += 10;

  for (const tour of tours) {
    ensureSpace(CARD_H + CARD_GAP);

    const content = getTourContentForLang(
      tour.translations,
      lang,
      tour.name,
      tour.description
    );
    const price = priceMap.get(tour.id) ?? { price_adult: 0, price_child: 0 };
    const cardTop = y;

    // Kart cercevesi
    pdf.setDrawColor(220, 225, 230);
    pdf.setFillColor(252, 253, 255);
    pdf.roundedRect(margin, cardTop, contentW, CARD_H, 2, 2, "FD");

    // Sol: dikey foto (kareye yakin)
    const imgData = imageCache.get(tour.id);
    if (imgData) {
      try {
        pdf.addImage(
          imgData,
          "JPEG",
          margin + 3,
          cardTop + 3,
          IMG_W,
          IMG_H
        );
      } catch {
        pdf.setFillColor(230, 235, 240);
        pdf.rect(margin + 3, cardTop + 3, IMG_W, IMG_H, "F");
      }
    } else {
      pdf.setFillColor(230, 235, 240);
      pdf.rect(margin + 3, cardTop + 3, IMG_W, IMG_H, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 160);
      pdf.text("Photo", margin + 3 + IMG_W / 2, cardTop + 3 + IMG_H / 2, {
        align: "center",
      });
    }

    let ty = cardTop + 5;

    // Baslik
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(25, 25, 25);
    const title = pdfText(content.name);
    const titleLines = pdf.splitTextToSize(title, textW);
    pdf.text(titleLines.slice(0, 2), textX, ty);
    ty += Math.min(titleLines.length, 2) * 4.5 + 1;

    // Sure
    const dur = formatDurationLabel(tour.duration);
    if (dur) {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `${pdfText(tourUi.duration)}: ${pdfText(dur)}`,
        textX,
        ty
      );
      ty += 4;
    }

    // Fiyat
    pdf.setFillColor(235, 245, 255);
    pdf.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    const priceBoxW = textW;
    const priceBoxH = 9;
    pdf.roundedRect(textX, ty, priceBoxW, priceBoxH, 1.5, 1.5, "FD");
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    pdf.text(
      `${pdfText(catalogUi.adultPrice)} EUR ${price.price_adult}  |  ${pdfText(catalogUi.childPrice)} EUR ${price.price_child}`,
      textX + 2,
      ty + 6
    );
    ty += priceBoxH + 2;

    // Kisa aciklama (max 2 satir)
    const desc = content.description?.trim();
    if (desc) {
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const descLines = pdf.splitTextToSize(pdfText(desc), textW);
      const shown = descLines.slice(0, 2);
      pdf.text(shown, textX, ty);
      ty += shown.length * 3.2;
    }

    // Highlights (max 2 madde)
    const highlights = (content.highlights ?? []).filter((h) => h.trim()).slice(0, 2);
    if (highlights.length > 0 && ty < cardTop + CARD_H - 4) {
      pdf.setFontSize(7);
      pdf.setTextColor(80, 80, 80);
      for (const h of highlights) {
        const line = pdf.splitTextToSize(`- ${pdfText(h)}`, textW)[0];
        if (ty < cardTop + CARD_H - 3) {
          pdf.text(line, textX, ty);
          ty += 3.2;
        }
      }
    }

    y = cardTop + CARD_H + CARD_GAP;
  }

  // Son sayfa alti: iletisim (yeni sayfa gerekirse)
  ensureSpace(28);
  y += 4;
  pdf.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  pdf.line(margin, y, margin + contentW, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  pdf.text(pdfText(tourUi.contact), margin, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(8);
  pdf.text(EASYBOOK_CONTACT.phoneDisplay, margin, y);
  y += 4;
  pdf.text(EASYBOOK_CONTACT.website, margin, y);
  y += 4;
  pdf.text(EASYBOOK_CONTACT.location, margin, y);

  const arrayBuffer = pdf.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
