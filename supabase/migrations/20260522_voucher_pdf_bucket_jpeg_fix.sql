-- voucher-pdfs bucket: JPEG ve PNG MIME tiplerini kesinlikle izin listesine ekle.
-- Önceki migration'da eksik olabilir; upsert ile güncelliyoruz.
UPDATE storage.buckets
SET
  public = true,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
WHERE id = 'voucher-pdfs';
