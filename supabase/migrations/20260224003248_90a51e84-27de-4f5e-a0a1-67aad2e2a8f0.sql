
-- Add equipped_badge column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_badge text DEFAULT NULL;
