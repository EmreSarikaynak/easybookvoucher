import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const TICKET_WIDTH = 850;
export const TICKET_HEIGHT = 300;

const canvasOptions = {
  scale: 2,
  useCORS: true,
  allowTaint: true,
  logging: false,
  backgroundColor: "#ffffff",
  width: TICKET_WIDTH,
  height: TICKET_HEIGHT,
  windowWidth: TICKET_WIDTH,
  windowHeight: TICKET_HEIGHT,
  scrollX: 0,
  scrollY: 0,
  x: 0,
  y: 0,
  imageTimeout: 5000,
} as const;

/** Bilet HTML → canvas (PDF ve JPEG için ortak) */
export async function captureTicketCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 300));
  return html2canvas(element, canvasOptions);
}

/** WhatsApp ek dosyası — JPEG Meta/Twilio'da PDF'den daha güvenilir iletilir */
export async function generateTicketJpegBlob(
  element: HTMLElement,
  quality = 0.92
): Promise<Blob> {
  const canvas = await captureTicketCanvas(element);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("JPEG oluşturulamadı")),
      "image/jpeg",
      quality
    );
  });
}

/**
 * HTML elementini PDF'e çevirir
 * @param element - PDF'e çevrilecek HTML elementi
 * @param filename - İndirilecek dosya adı
 */
export async function generatePDF(
  element: HTMLElement,
  filename: string
): Promise<jsPDF> {
  const width = TICKET_WIDTH;
  const height = TICKET_HEIGHT;
  const canvas = await captureTicketCanvas(element);

  // PDF oluştur
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  // PNG formatında görsel ekle
  const imgData = canvas.toDataURL("image/png", 1.0);
  pdf.addImage(imgData, "PNG", 0, 0, width, height);

  // Tıklanabilir linkleri ekle
  const links = element.querySelectorAll("a");
  const containerRect = element.getBoundingClientRect();

  links.forEach((link) => {
    const rect = link.getBoundingClientRect();
    const href = link.getAttribute("href");

    if (href && href.startsWith("http")) {
      const x = rect.left - containerRect.left;
      const y = rect.top - containerRect.top;
      const w = rect.width;
      const h = rect.height;
      pdf.link(x, y, w, h, { url: href });
    }
  });

  return pdf;
}

/**
 * PDF'i indirir
 * @param element - PDF'e çevrilecek HTML elementi
 * @param filename - İndirilecek dosya adı (uzantısız veya .pdf ile)
 */
export async function downloadPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const pdf = await generatePDF(element, filename);

  // Remove .pdf extension if already present to prevent duplicate
  const cleanFilename = filename.replace(/\.pdf$/i, '');

  // Convert PDF to blob
  const pdfBlob = pdf.output('blob');

  // Create download link
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanFilename}.pdf`;  // Ensure .pdf extension

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * PDF'i base64 string olarak döndürür (WhatsApp paylaşımı için)
 * @param element - PDF'e çevrilecek HTML elementi
 */
export async function getPDFBase64(element: HTMLElement): Promise<string> {
  const canvas = await captureTicketCanvas(element);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [TICKET_WIDTH, TICKET_HEIGHT],
    hotfixes: ["px_scaling"],
  });
  const imgData = canvas.toDataURL("image/png", 1.0);
  pdf.addImage(imgData, "PNG", 0, 0, TICKET_WIDTH, TICKET_HEIGHT);
  return pdf.output("datauristring");
}
