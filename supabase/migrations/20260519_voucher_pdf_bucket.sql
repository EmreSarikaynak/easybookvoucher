-- Create voucher-pdfs storage bucket (public read so PDF URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voucher-pdfs',
    'voucher-pdfs',
    true,
    10485760,   -- 10 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload (insert/update)
CREATE POLICY "Authenticated users can upload voucher PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voucher-pdfs');

CREATE POLICY "Authenticated users can update voucher PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'voucher-pdfs');

-- RLS: public read
CREATE POLICY "Anyone can read voucher PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voucher-pdfs');

-- Service role bypass is automatic, no extra policy needed.
