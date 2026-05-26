import QRCode from "qrcode";

/**
 * Verilen URL/metni PNG data URL olarak QR koda dönüştürür.
 * Hem server hem client'ta çalışır (qrcode kütüphanesi izomorfik).
 */
export async function qrToDataUrl(
  text: string,
  options: { width?: number; margin?: number; color?: { dark?: string; light?: string } } = {}
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options.width ?? 320,
    margin: options.margin ?? 2,
    errorCorrectionLevel: "M",
    color: {
      dark: options.color?.dark ?? "#0f172a",
      light: options.color?.light ?? "#ffffff",
    },
  });
}

/**
 * QR'ı SVG string olarak döner. PDF veya inline-SVG için.
 */
export async function qrToSvgString(
  text: string,
  options: { margin?: number } = {}
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: options.margin ?? 2,
    errorCorrectionLevel: "M",
  });
}
