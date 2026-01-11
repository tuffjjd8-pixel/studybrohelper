-- Add speech clips tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS speech_clips_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_speech_reset timestamp with time zone DEFAULT now();

-- Remove deprecated graphs_used_today column (optional cleanup)
-- We'll keep it for now to avoid breaking anything, but it's no longer used