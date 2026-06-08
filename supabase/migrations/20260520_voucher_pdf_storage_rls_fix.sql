-- voucher-pdfs bucket RLS (production'da eksikse uygulanır)
-- Not: API upload service role kullandığı için zorunlu değil; yedek olarak bırakıldı.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voucher-pdfs',
    'voucher-pdfs',
    true,
    10485760,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload voucher PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can upload voucher PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voucher-pdfs');

DROP POLICY IF EXISTS "Authenticated users can update voucher PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can update voucher PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voucher-pdfs')
WITH CHECK (bucket_id = 'voucher-pdfs');

DROP POLICY IF EXISTS "Anyone can read voucher PDFs" ON storage.objects;
CREATE POLICY "Anyone can read voucher PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'voucher-pdfs');
