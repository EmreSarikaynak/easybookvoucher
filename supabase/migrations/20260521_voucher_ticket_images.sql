-- voucher-pdfs bucket: JPEG bilet görseli (WhatsApp ek dosyası)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'voucher-pdfs';
