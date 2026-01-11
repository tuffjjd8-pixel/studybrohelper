-- 1. FIX PROFILES TABLE: Remove overly permissive policy
DROP POLICY IF EXISTS "Deny anonymous access" ON public.profiles;

-- 2. FIX POLL_VOTES TABLE: Remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can view votes" ON public.poll_votes;

-- 3. Create secure function to get aggregated vote counts for a poll
CREATE OR REPLACE FUNCTION public.get_poll_vote_counts(poll_id_param uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('option_index', option_index, 'count', vote_count)
      ORDER BY option_index
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT option_index, COUNT(*) as vote_count
    FROM public.poll_votes
    WHERE poll_id = poll_id_param
    GROUP BY option_index
  ) counts;
$$;

-- 4. Create function to check if current user voted on a poll
CREATE OR REPLACE FUNCTION public.get_user_vote(poll_id_param uuid, voter_id_param text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT option_index
  FROM public.poll_votes
  WHERE poll_id = poll_id_param AND voter_id = voter_id_param
  LIMIT 1;
$$;

-- 5. Create secure view for polls that hides created_by
CREATE OR REPLACE VIEW public.public_polls AS
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