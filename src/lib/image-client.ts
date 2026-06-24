/**
 * Tarayıcı tarafı görsel normalizasyonu.
 *
 * PDF üretiminde kullanılan kütüphaneler (@react-pdf/renderer ve jsPDF) yalnızca
 * JPEG/PNG gömebiliyor; webp/heic gibi formatlar render edilmiyor. Cloudflare
 * Workers'da sunucu tarafı görsel dönüştürme (sharp) çalışmadığı için, yükleme
 * anında tarayıcıda JPEG'e çeviririz. Böylece depoda her zaman jpeg durur ve
 * tüm PDF akışları (katalog + tek-tur) her ortamda sorunsuz çalışır.
 */

const MAX_DIMENSION = 2000; // büyük fotoğrafları makul boyuta indir

/**
 * Verilen görsel dosyasını JPEG'e çevirir. JPEG zaten ise ve boyutu makulse
 * olduğu gibi döner. Tarayıcı API'leri yoksa (SSR) dosyayı değiştirmeden döner.
 */
export async function convertImageFileToJpeg(file: File): Promise<File> {
  // Tarayıcı dışıysa veya görsel değilse dokunma
  if (typeof createImageBitmap === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }
  // Zaten jpeg ve küçükse dönüştürmeye gerek yok
  if (file.type === "image/jpeg") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const blob = await drawToJpegBlob(bitmap, width, height);
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file; // dönüştürme başarısızsa orijinali yükle
  }
}

async function drawToJpegBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob | null> {
  // Şeffaf alanlar JPEG'de siyah olmasın diye beyaz zemin
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
    );
  }
  return null;
}
