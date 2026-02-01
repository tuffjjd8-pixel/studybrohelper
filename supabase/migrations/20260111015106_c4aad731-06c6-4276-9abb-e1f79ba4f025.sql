-- Drop the permissive INSERT policy 
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;

-- Create a more restrictive INSERT policy requiring authentication and matching voter_id
CREATE POLICY "Authenticated users can vote with their ID"
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (voter_id = auth.uid()::text);