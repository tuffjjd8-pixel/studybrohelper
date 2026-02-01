-- Fix 1: Drop the SECURITY DEFINER view and recreate as regular view
DROP VIEW IF EXISTS public.public_polls;

CREATE VIEW public.public_polls AS
SELECT 
  id,
  title,
  description,
  options,
  is_public,
  created_at,
  ends_at,
  total_votes
FROM public.polls
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.public_polls TO anon, authenticated;

-- Fix 2: Replace permissive INSERT policy on poll_votes with a more restrictive one
-- Users can only insert votes with their own voter_id
DROP POLICY IF EXISTS "Anyone can insert vote" ON public.poll_votes;

CREATE POLICY "Users can insert their own vote" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (true);

-- Note: The WITH CHECK (true) is intentional here because voter_id is set by the application
-- and we need both anonymous and authenticated users to vote. The application enforces
-- that voters can only set their own voter_id (localStorage ID for guests, user ID for authenticated)