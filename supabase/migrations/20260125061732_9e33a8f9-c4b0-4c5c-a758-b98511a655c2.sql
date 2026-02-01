-- Add subscription tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS renewal_date timestamp with time zone;