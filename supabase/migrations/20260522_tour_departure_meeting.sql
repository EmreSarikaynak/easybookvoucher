-- Tur katalog PDF için yeni alanlar
-- included / excluded: TourTranslations JSONB içine yazılır (dile göre), SQL gerektirmez.
-- departure_days / departure_time / meeting_point: dilden bağımsız (canonical English gün anahtarları, label render'da çevrilir)

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS departure_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS departure_time TIME,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT;

COMMENT ON COLUMN tours.departure_days IS
  'Canonical English weekday keys: monday|tuesday|wednesday|thursday|friday|saturday|sunday. PDF renderer i18n labels uygular.';
COMMENT ON COLUMN tours.departure_time IS 'Kalkış saati (HH:MM). Tek değer; birden çok kalkış varsa meeting_point/description içine yaz.';
COMMENT ON COLUMN tours.meeting_point IS 'Buluşma noktası serbest metin (ör. "Bodrum Marina Liman Girişi"). Çok dilli değil — yer adı genelde aynı kalır.';
