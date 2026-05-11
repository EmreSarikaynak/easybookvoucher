-- =========================================================
-- Acente Kodu Sistemi - Migration
-- Her acenteye 2026 ile başlayan otomatik kod atar
-- =========================================================

-- 1. agency_code alanı ekle
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agency_code TEXT UNIQUE;

-- 2. Mevcut acentelere kod ata (2026001, 2026002, ...)
WITH numbered_agencies AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM agencies
  WHERE agency_code IS NULL
)
UPDATE agencies 
SET agency_code = '2026' || LPAD(na.rn::TEXT, 3, '0')
FROM numbered_agencies na
WHERE agencies.id = na.id;

-- 3. agency_code için NOT NULL constraint ekle
ALTER TABLE agencies ALTER COLUMN agency_code SET NOT NULL;
