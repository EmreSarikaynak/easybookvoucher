import QRCode from "qrcode";

/**
 * QR kod oluşturur ve Base64 Data URL olarak döndürür
 * @param url - QR koda gömülecek URL
 * @returns Base64 PNG Data URL
 */
export async function generateQRCodeDataURL(url: string): Promise<string> {
    try {
        const dataURL = await QRCode.toDataURL(url, {
            errorCorrectionLevel: "M", // Medium error correction
            type: "image/png",
            width: 160, // 2x for retina (80px display)
            margin: 1,
            color: {
                dark: "#1f2937", // QR color (dark gray)
                light: "#ffffff", // Background (white)
            },
        });
        return dataURL;
    } catch (error) {
        console.error("QR code generation error:", error);
        throw new Error("QR kod oluşturulamadı");
    }
}

/**
 * QR kodun geçerli bir URL olup olmadığını kontrol eder
 */
export function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
