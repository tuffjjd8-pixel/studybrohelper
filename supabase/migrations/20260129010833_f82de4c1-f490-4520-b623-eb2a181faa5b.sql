-- Add speed_solves column to profiles for tracking fast solves (under 2 minutes)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS speed_solves integer DEFAULT 0;