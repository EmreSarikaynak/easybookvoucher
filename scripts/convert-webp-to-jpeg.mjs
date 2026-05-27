/**
 * Tek seferlik migration: tour-photos bucket'ındaki webp (ve jpeg/png olmayan)
 * görselleri JPEG'e çevirir, yeni dosyayı yükler ve tours.images[] URL'lerini
 * günceller.
 *
 * Neden: PDF kütüphaneleri (@react-pdf, jsPDF) yalnızca JPEG/PNG gömebiliyor;
 * Cloudflare Workers'da sunucu tarafı dönüştürme yapılamadığı için eski webp
 * görseller tek-tur PDF'inde görünmüyordu.
 *
 * Çalıştırma:
 *   node --env-file=.env.local scripts/convert-webp-to-jpeg.mjs          (gerçek)
 *   DRY=1 node --env-file=.env.local scripts/convert-webp-to-jpeg.mjs    (önizleme)
 *
 * Güvenli: eski dosyalar SİLİNMEZ, sadece yeni jpeg yüklenir; idempotent.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.env.DRY === "1";

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik. --env-file=.env.local ile çalıştır.");
  process.exit(1);
}

const BUCKET = "tour-photos";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const randName = () =>
  `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

/** URL jpeg/png değilse jpeg'e çevirip yeni public URL döner; değilse aynı URL. */
async function convertIfNeeded(imgUrl) {
  try {
    const res = await fetch(imgUrl, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`  ! indirilemedi (${res.status}): ${imgUrl}`);
      return imgUrl;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (meta.format === "jpeg" || meta.format === "png") {
      return imgUrl; // zaten gömülebilir
    }
    // webp/gif/avif/heic → jpeg
    if (DRY) {
      console.log(`  ~ [DRY] çevrilecek (${meta.format}): ${imgUrl}`);
      return imgUrl;
    }
    const jpeg = await sharp(buf)
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    const fileName = randName();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, jpeg, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
    if (upErr) {
      console.error(`  ✗ yükleme hatası: ${upErr.message}`);
      return imgUrl;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    console.log(`  ✓ ${meta.format} → jpeg: ${fileName}`);
    return data.publicUrl;
  } catch (e) {
    console.warn(`  ! atlandı (${e?.message ?? e}): ${imgUrl}`);
    return imgUrl;
  }
}

async function run() {
  console.log(DRY ? "DRY RUN — değişiklik yapılmayacak\n" : "Migration başlıyor...\n");
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id, name, images");
  if (error) {
    console.error("Tur listesi alınamadı:", error.message);
    process.exit(1);
  }
  console.log(`${tours.length} tur bulundu.\n`);

  let converted = 0;
  let updatedRows = 0;

  for (const t of tours) {
    const imgs = Array.isArray(t.images) ? t.images : [];
    let changed = false;

    const newImgs = [];
    for (const u of imgs) {
      if (!u) {
        newImgs.push(u);
        continue;
      }
      const nu = await convertIfNeeded(u);
      if (nu !== u) {
        changed = true;
        converted++;
      }
      newImgs.push(nu);
    }

    if (changed && !DRY) {
      const { error: updErr } = await supabase
        .from("tours")
        .update({ images: newImgs })
        .eq("id", t.id);
      if (updErr) {
        console.error(`✗ ${t.name}: DB güncellenemedi — ${updErr.message}`);
      } else {
        updatedRows++;
        console.log(`✓ ${t.name}: güncellendi`);
      }
    } else if (changed && DRY) {
      console.log(`~ [DRY] ${t.name}: güncellenecek`);
    }
  }

  console.log(
    `\nBitti. ${converted} görsel ${DRY ? "çevrilecek" : "çevrildi"}, ${updatedRows} tur ${DRY ? "" : "güncellendi"}.`
  );
}

run();
