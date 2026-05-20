import { jsPDF } from "jspdf";
import {
  getTourContentForLang,
  getTourPageUi,
  type TourLang,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { EASYBOOK_CONTACT } from "@/lib/constants";

export interface TourPdfInput {
  name: string;
  description: string | null;
  duration: string | null;
  pickup_locations: string[];
  images: string[];
  translations?: TourTranslations | null;
  tour_managers?: { name: string; phone: string }[];
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

  const cover = tour.images?.[0];
  if (cover) {
    const dataUrl = await fetchImageAsDataUrl(cover);
    if (dataUrl) {
      if (y + 55 > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      try {
        pdf.addImage(dataUrl, "JPEG", margin, y, pageW - margin * 2, 50);
        y += 55;
      } catch {
        /* skip broken image */
      }
    }
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
