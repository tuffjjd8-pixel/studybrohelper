-- Drop the existing public SELECT policy on polls table
DROP POLICY IF EXISTS "Anyone can view public polls" ON public.polls;

-- Create a new SELECT policy that only allows poll admin to see all poll data (including created_by)
CREATE POLICY "Only poll admin can view all polls"
ON public.polls
FOR SELECT
TO authenticated
USING (is_poll_admin(auth.uid()));