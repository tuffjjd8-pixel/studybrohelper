-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  total_votes INTEGER NOT NULL DEFAULT 0
);

-- Create poll votes table to track who voted for what
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL, -- Can be user_id or anonymous session id
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Poll policies: Everyone can view public polls
CREATE POLICY "Anyone can view public polls"
ON public.polls
FOR SELECT
USING (is_public = true);

-- Only ApexWav (apexwavesstudios@gmail.com) can manage polls
-- We'll check this in the application layer since we need email verification

-- Allow ApexWav to insert polls (checked by email in app)
CREATE POLICY "Authenticated users can insert polls if admin"
ON public.polls
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow ApexWav to update polls
CREATE POLICY "Authenticated users can update polls if admin"
ON public.polls
FOR UPDATE
TO authenticated
USING (true);

-- Allow ApexWav to delete polls
CREATE POLICY "Authenticated users can delete polls if admin"
ON public.polls
FOR DELETE
TO authenticated
USING (true);

-- Poll votes: Anyone can vote (even anonymous)
CREATE POLICY "Anyone can view votes"
ON public.poll_votes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert vote"
ON public.poll_votes
FOR INSERT
WITH CHECK (true);

-- Prevent vote changing
CREATE POLICY "No one can update votes"
ON public.poll_votes
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete votes"
ON public.poll_votes
FOR DELETE
USING (false);