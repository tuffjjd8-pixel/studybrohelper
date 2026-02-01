-- Add columns to profiles for referral tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;

-- Create referrals table to track referral completions
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (ones they made)
CREATE POLICY "Users can view their referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- System inserts referrals (via service role when user signs up)
CREATE POLICY "Service role can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- Function to complete referral and grant premium
CREATE OR REPLACE FUNCTION public.complete_referral(referred_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer UUID;
  current_premium_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find pending referral for this user
  SELECT referrer_id INTO referrer
  FROM public.referrals
  WHERE referred_user_id = referred_id AND status = 'pending';
  
  IF referrer IS NOT NULL THEN
    -- Get referrer's current premium_until
    SELECT premium_until INTO current_premium_until
    FROM public.profiles
    WHERE user_id = referrer;
    
    -- Grant 1 day of premium (extend if already premium)
    UPDATE public.profiles
    SET 
      is_premium = true,
      premium_until = GREATEST(
        COALESCE(current_premium_until, now()),
        now()
      ) + INTERVAL '1 day'
    WHERE user_id = referrer;
    
    -- Mark referral as completed
    UPDATE public.referrals
    SET status = 'completed', completed_at = now()
    WHERE referred_user_id = referred_id;
  END IF;
END;
$$;

-- Function to check and expire premium
CREATE OR REPLACE FUNCTION public.check_premium_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.premium_until IS NOT NULL AND NEW.premium_until < now() THEN
    NEW.is_premium = false;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-expire premium on profile access
CREATE TRIGGER check_premium_expiry_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_premium_expiry();