-- Fix the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert referrals" ON public.referrals;

-- Only allow inserts where the referred_user_id matches the authenticated user
CREATE POLICY "Users can create their own referral record"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_user_id);