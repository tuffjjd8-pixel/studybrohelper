-- Fix: Deny anonymous access to profiles table
-- This ensures only authenticated users can read profile data

CREATE POLICY "Deny anonymous access"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);