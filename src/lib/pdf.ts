import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * HTML elementini PDF'e çevirir
 * @param element - PDF'e çevrilecek HTML elementi
 * @param filename - İndirilecek dosya adı
 */
export async function generatePDF(
  element: HTMLElement,
  filename: string
): Promise<jsPDF> {
  const width = 850;
  const height = 300;

  // Fontların yüklenmesini bekle
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 300));

  // html2canvas ile yakalama - stabil ayarlar
  const canvas = await html2canvas(element, {
    scale: 2, // 2x yeterli çözünürlük
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: width,
    height: height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    imageTimeout: 5000,
  });

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
  const width = 850;
  const height = 300;

  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 200));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: width,
    height: height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  pdf.addImage(imgData, "PNG", 0, 0, width, height);

  return pdf.output("datauristring");
}
