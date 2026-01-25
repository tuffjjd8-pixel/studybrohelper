-- Add quiz usage tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS quizzes_used_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_reset timestamp with time zone DEFAULT now();