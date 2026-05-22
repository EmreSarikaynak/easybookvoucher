/**
 * Tur Kataloğu PDF üretim testi (3 dilde 3 dosya).
 *
 *   node --import tsx scripts/test-catalog-pdf.mjs
 *
 * Auth bypass: doğrudan service-role anahtarıyla DB'den ilk aktif acente
 * için tüm aktif turları çeker ve katalog-{tr,en,ru}.pdf dosyalarını projenin
 * köküne yazar.
 */

import fs from "node:fs/promises";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Doğrudan kaynaktan import (tsx ile çalışır)
const { generateTourCatalogPdfBuffer } = await import(
  "../src/lib/tour-catalog-pdf.tsx"
);
const { fetchCatalogPdfDataset } = await import(
  "../src/lib/tour-catalog-data.ts"
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// İlk aktif acenteyi al
const { data: agencies, error: agErr } = await supabase
  .from("agencies")
  .select("id, name")
  .eq("is_active", true)
  .order("name")
  .limit(1);

if (agErr || !agencies?.length) {
  console.error("Aktif acente bulunamadı:", agErr?.message);
  process.exit(1);
}

const agency = agencies[0];
console.log(`Acente: ${agency.name} (${agency.id})`);

const { data: dataset, error: dsErr } = await fetchCatalogPdfDataset(
  supabase,
  agency.id
);

if (!dataset || dsErr) {
  console.error("Dataset hatası:", dsErr);
  process.exit(1);
}

console.log(`Tur sayısı: ${dataset.tourCount}`);

// site_logo
const { data: logoRow } = await supabase
  .from("settings")
  .select("value")
  .eq("key", "site_logo")
  .single();
const logoUrl = logoRow?.value ?? null;
console.log("Logo:", logoUrl ?? "(yok)");

const outDir = path.join(process.cwd(), "tmp-catalog-output");
await fs.mkdir(outDir, { recursive: true });

for (const lang of ["tr", "en", "ru"]) {
  console.log(`\n[${lang}] PDF üretiliyor...`);
  const t0 = Date.now();
  const buf = await generateTourCatalogPdfBuffer({
    tours: dataset.tours,
    prices: dataset.prices,
    lang,
    agencyName: dataset.agencyName,
    logoUrl,
  });
  const ms = Date.now() - t0;
  const outPath = path.join(outDir, `katalog-${lang.toUpperCase()}.pdf`);
  await fs.writeFile(outPath, buf);
  console.log(`  → ${outPath} (${(buf.length / 1024).toFixed(1)} KB, ${ms}ms)`);
}

console.log("\nTamam.");
