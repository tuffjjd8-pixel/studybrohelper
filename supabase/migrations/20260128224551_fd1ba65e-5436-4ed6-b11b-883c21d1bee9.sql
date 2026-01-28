-- Create badges table to track unlocked badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_key)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own badges (via trigger or direct)
CREATE POLICY "Users can insert their own badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own badge progress
CREATE POLICY "Users can update their own badges"
ON public.user_badges
FOR UPDATE
USING (auth.uid() = user_id);

-- Add subject_solves column to profiles for tracking solves per subject
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subject_solves JSONB DEFAULT '{}'::jsonb;

-- Add referral_count column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Create function to update referral count when referral is completed
CREATE OR REPLACE FUNCTION public.update_referral_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    UPDATE public.profiles
    SET referral_count = COALESCE(referral_count, 0) + 1
    WHERE user_id = NEW.referrer_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for referral count updates
DROP TRIGGER IF EXISTS on_referral_completed ON public.referrals;
CREATE TRIGGER on_referral_completed
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_count();