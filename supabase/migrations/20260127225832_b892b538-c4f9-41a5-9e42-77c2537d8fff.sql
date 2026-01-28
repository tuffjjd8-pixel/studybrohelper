-- Add image_url column to polls table for main poll image
ALTER TABLE public.polls 
ADD COLUMN image_url text NULL;

-- Update the public_polls view to include image_url
DROP VIEW IF EXISTS public.public_polls;
CREATE VIEW public.public_polls WITH (security_invoker=on) AS
SELECT 
  id,
  title,
  description,
  options,
  is_public,
  created_at,
  ends_at,
  total_votes,
  image_url
FROM public.polls
WHERE is_public = true;

-- Note: Option images are stored in the options JSONB array as { text: string, votes: number, imageUrl?: string }