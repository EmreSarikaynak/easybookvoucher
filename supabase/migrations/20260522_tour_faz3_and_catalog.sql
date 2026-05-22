-- Faz 3 + arkaplan: tek migration
-- included / excluded: tours.translations JSONB (TourTranslations), SQL kolonu yok
-- departure_days: canonical EN keys (monday..sunday), PDF'de i18n etiket
-- catalog_background_url: PDF katalog A4 arkaplan (~25% opacity), sayfa basina 2 tur — ust turun URL'i

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS departure_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS departure_time TIME,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS catalog_background_url TEXT;

COMMENT ON COLUMN tours.departure_days IS
  'Canonical English weekday keys: monday|tuesday|wednesday|thursday|friday|saturday|sunday. PDF renderer i18n labels uygular.';

COMMENT ON COLUMN tours.departure_time IS
  'Kalkis saati (HH:MM). Tek deger; birden cok kalkis varsa meeting_point veya aciklama alanina yazilir.';

COMMENT ON COLUMN tours.meeting_point IS
  'Bulusma noktasi (serbest metin, or. Bodrum Marina). Cok dilli degil.';

COMMENT ON COLUMN tours.catalog_background_url IS
  'Opsiyonel A4 arkaplan (tour-photos bucket public URL). PDF katalogda ~25% opacity; sayfa 2 tur — ustteki turun degeri kullanilir.';
