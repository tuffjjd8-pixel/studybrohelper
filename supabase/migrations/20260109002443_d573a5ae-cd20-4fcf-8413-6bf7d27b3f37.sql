-- Fix the broken poll_votes UPDATE policy
-- The current policy (voter_id = voter_id) always evaluates to true

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can update their own votes" ON public.poll_votes;

-- Create fixed policy that checks against the actual voter
CREATE POLICY "Users can update their own votes" 
ON public.poll_votes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Actually, we need to think about this differently.
-- The voter_id is stored as TEXT, not UUID referencing auth.users
-- For anonymous voting, we store a client-generated ID
-- So we can't validate against auth.uid() directly
-- 
-- Instead, we should prevent updates entirely OR
-- only allow updates from the same session
-- For security, let's just prevent updates to votes (they can delete and re-vote)

DROP POLICY IF EXISTS "Users can update their own votes" ON public.poll_votes;

-- Prevent all vote updates for security
CREATE POLICY "No one can update votes" 
ON public.poll_votes 
FOR UPDATE 
USING (false);

-- Fix the INSERT policy - it currently uses WITH CHECK (true) which is too permissive
-- But for polls, we want anyone to be able to vote, so this is intentional
-- However, we should ensure voters can't vote more than once per poll
-- This is handled by the unique constraint, so the policy is OK

-- Note: The "Anyone can insert vote" policy with WITH CHECK (true) is acceptable 
-- because we have a unique constraint on (poll_id, voter_id) to prevent duplicate votes