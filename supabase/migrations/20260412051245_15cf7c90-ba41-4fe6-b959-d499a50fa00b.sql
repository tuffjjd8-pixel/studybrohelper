
-- Add is_public column defaulting to true
ALTER TABLE public.solves ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Allow anyone (including anonymous) to read public solves
CREATE POLICY "Anyone can view public solves"
ON public.solves
FOR SELECT
USING (is_public = true);
