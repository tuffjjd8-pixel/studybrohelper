-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own vote" ON public.poll_votes;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can vote"
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add a unique constraint to prevent duplicate votes (poll_id, voter_id combination)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_poll_id_voter_id_key'
  ) THEN
    ALTER TABLE public.poll_votes ADD CONSTRAINT poll_votes_poll_id_voter_id_key UNIQUE (poll_id, voter_id);
  END IF;
END $$;