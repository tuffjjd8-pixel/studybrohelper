-- 1. Add mode column to solves
ALTER TABLE public.solves
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'instant';

-- 2. Create storage bucket for persisted solve images
INSERT INTO storage.buckets (id, name, public)
VALUES ('solve-images', 'solve-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
DROP POLICY IF EXISTS "Solve images are publicly accessible" ON storage.objects;
CREATE POLICY "Solve images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'solve-images');

DROP POLICY IF EXISTS "Users can upload their own solve images" ON storage.objects;
CREATE POLICY "Users can upload their own solve images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'solve-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own solve images" ON storage.objects;
CREATE POLICY "Users can delete their own solve images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'solve-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);