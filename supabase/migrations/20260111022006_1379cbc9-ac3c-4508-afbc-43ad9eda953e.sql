-- Fix poll_votes INSERT policy to properly require authentication
DROP POLICY IF EXISTS "Authenticated users can vote with their ID" ON public.poll_votes;

CREATE POLICY "Authenticated users can vote with their ID"
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (voter_id = auth.uid()::text);

-- Add SELECT policy so users can view their own vote (needed for checking existing votes)
CREATE POLICY "Users can view their own votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (voter_id = auth.uid()::text);