-- Tur kataloğu PDF: her tur için opsiyonel A4 arkaplan görseli.
-- Sayfada 2 tur paylaşır; sayfa, üstteki turun catalog_background_url'ini kullanır.
-- Bucket: tour-photos (mevcut), Supabase storage public URL.

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS catalog_background_url TEXT;

COMMENT ON COLUMN tours.catalog_background_url IS
  'Opsiyonel A4 arkaplan görseli (PDF kataloğunda ~25% opacity ile basılır). Sayfa 2 turdan oluştuğu için sadece sayfanın ilk turunun değeri kullanılır.';
