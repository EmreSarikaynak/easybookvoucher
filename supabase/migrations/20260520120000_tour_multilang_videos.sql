-- Tour multilingual content + videos
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

COMMENT ON COLUMN tours.translations IS 'Per-language content: { "tr": { "name", "description", "highlights": [] }, "en": {...}, "ru": {...}, "pl": {...} }';

-- tour-photos bucket (public read for customer pages)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-photos',
  'tour-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload tour photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tour-photos');

CREATE POLICY "Authenticated users can update tour photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tour-photos');

CREATE POLICY "Anyone can read tour photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-photos');

-- tour-videos bucket (public read for customer pages)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-videos',
  'tour-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- tour-pdfs bucket (generated brochures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-pdfs',
  'tour-pdfs',
  true,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- tour-videos: authenticated upload
CREATE POLICY "Authenticated users can upload tour videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tour-videos');

CREATE POLICY "Authenticated users can update tour videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tour-videos');

CREATE POLICY "Anyone can read tour videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-videos');

-- tour-pdfs: authenticated upload, public read
CREATE POLICY "Authenticated users can upload tour pdfs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tour-pdfs');

CREATE POLICY "Authenticated users can update tour pdfs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tour-pdfs');

CREATE POLICY "Anyone can read tour pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-pdfs');
