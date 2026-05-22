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

const BRAND_RGB = { r: 15, g: 76, b: 129 };

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

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  const drawHeader = (subtitle?: string) => {
    pdf.setFillColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    pdf.rect(0, 0, pageW, 32, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Easy Book Tours", margin, 14);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const sub = subtitle || catalogUi.tourCatalog;
    pdf.text(sub, margin, 22);
    if (agencyName) {
      pdf.setFontSize(9);
      pdf.text(agencyName, pageW - margin, 22, { align: "right" });
    }
    pdf.setTextColor(0, 0, 0);
  };

  const addFooter = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(EASYBOOK_CONTACT.website, margin, pageH - 8);
    pdf.text(
      `${catalogUi.generatedOn}: ${new Date().toLocaleDateString(lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-GB")}`,
      pageW - margin,
      pageH - 8,
      { align: "right" }
    );
  };

  // —— Kapak ——
  drawHeader(catalogUi.catalogTitle);
  let y = 48;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(catalogUi.allTours, margin, y);
  y += 10;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  const intro =
    lang === "tr"
      ? `${tours.length} aktif tur — ${catalogUi.pricesEur}`
      : lang === "ru"
        ? `${tours.length} активных туров — ${catalogUi.pricesEur}`
        : `${tours.length} active tours — ${catalogUi.pricesEur}`;
  pdf.text(intro, margin, y);
  y += 8;
  if (agencyName) {
    pdf.setFont("helvetica", "bold");
    pdf.text(agencyName, margin, y);
    y += 8;
  }
  pdf.setFont("helvetica", "normal");
  pdf.text(`${tourUi.contact}: ${EASYBOOK_CONTACT.phoneDisplay}`, margin, y);
  y += 6;
  pdf.text(EASYBOOK_CONTACT.website, margin, y);
  addFooter();

  // —— Her tur ——
  for (const tour of tours) {
    pdf.addPage();
    drawHeader();
    y = 40;

    const content = getTourContentForLang(
      tour.translations,
      lang,
      tour.name,
      tour.description
    );
    const price = priceMap.get(tour.id) ?? { price_adult: 0, price_child: 0 };

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    const titleLines = pdf.splitTextToSize(content.name, contentW);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 7 + 2;

    if (tour.duration) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(90, 90, 90);
      pdf.text(`${tourUi.duration}: ${tour.duration}`, margin, y);
      y += 7;
    }

    // Fiyat kutusu
    const boxH = 14;
    pdf.setFillColor(240, 248, 255);
    pdf.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    pdf.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    pdf.text(
      `${catalogUi.adultPrice}: €${price.price_adult}   |   ${catalogUi.childPrice}: €${price.price_child}`,
      margin + 4,
      y + 9
    );
    y += boxH + 6;

    const cover = tour.images?.[0];
    if (cover) {
      const dataUrl = await fetchImageAsDataUrl(cover);
      if (dataUrl) {
        const imgH = 45;
        if (y + imgH > pageH - 25) {
          pdf.addPage();
          drawHeader();
          y = 40;
        }
        try {
          pdf.addImage(dataUrl, "JPEG", margin, y, contentW, imgH);
          y += imgH + 5;
        } catch {
          /* skip */
        }
      }
    }

    const addTextBlock = (text: string, size = 10, bold = false) => {
      pdf.setFontSize(size);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setTextColor(40, 40, 40);
      const lines = pdf.splitTextToSize(text, contentW);
      const lineH = size * 0.42;
      for (const line of lines) {
        if (y + lineH > pageH - 20) {
          pdf.addPage();
          drawHeader();
          y = 40;
        }
        pdf.text(line, margin, y);
        y += lineH + 1;
      }
      y += 2;
    };

    if (content.description?.trim()) {
      addTextBlock(content.description, 10);
    }

    if (content.highlights?.length) {
      addTextBlock(tourUi.highlights, 11, true);
      for (const h of content.highlights) {
        if (h.trim()) addTextBlock(`• ${h}`, 9);
      }
    }

    if (tour.pickup_locations?.length) {
      addTextBlock(tourUi.pickupLocations, 11, true);
      addTextBlock(tour.pickup_locations.join(", "), 9);
    }

    if (tour.tour_managers?.length) {
      addTextBlock(tourUi.tourManagers, 11, true);
      for (const m of tour.tour_managers) {
        if (m.name || m.phone) addTextBlock(`${m.name} — ${m.phone}`, 9);
      }
    }

    addFooter();
  }

  // —— İletişim sayfası ——
  if (tours.length > 0) {
    pdf.addPage();
    drawHeader(tourUi.contact);
    y = 50;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(tourUi.contact, margin, y);
    y += 10;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${EASYBOOK_CONTACT.phoneDisplay}`, margin, y);
    y += 7;
    pdf.text(EASYBOOK_CONTACT.website, margin, y);
    y += 7;
    pdf.text(EASYBOOK_CONTACT.location, margin, y);
    addFooter();
  }

  const arrayBuffer = pdf.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
