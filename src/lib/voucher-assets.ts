export function getVoucherJpegUrl(pdfUrl?: string | null): string | null {
  if (!pdfUrl) return null;
  return pdfUrl.replace(/\.pdf($|\?)/i, ".jpg$1");
}
