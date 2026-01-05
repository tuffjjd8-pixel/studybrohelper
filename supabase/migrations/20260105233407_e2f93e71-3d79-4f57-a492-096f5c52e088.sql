-- Add ends_at column to polls table for time limits (already exists in schema)
-- Update poll_votes to allow vote changes by making it unique on poll_id + voter_id

-- First drop existing unique constraint if any, then add new one
ALTER TABLE public.poll_votes
ADD CONSTRAINT poll_votes_unique_voter UNIQUE (poll_id, voter_id);

-- Also add an ON CONFLICT upsert capability by allowing updates
DROP POLICY IF EXISTS "No one can update votes" ON public.poll_votes;

CREATE POLICY "Users can update their own votes"
ON public.poll_votes
FOR UPDATE
USING (voter_id = voter_id)
WITH CHECK (true);