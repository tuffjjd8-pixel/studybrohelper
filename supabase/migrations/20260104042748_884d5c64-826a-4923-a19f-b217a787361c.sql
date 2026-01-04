-- Add columns to profiles for tracking daily animated steps and graphs usage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS animated_steps_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS graphs_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_usage_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Add comment explaining the reset logic
COMMENT ON COLUMN public.profiles.last_usage_date IS 'Last date usage counters were updated. Reset animated_steps_used_today and graphs_used_today when date changes (CST timezone)';
COMMENT ON COLUMN public.profiles.animated_steps_used_today IS 'Number of animated steps used today (Free: max 5, Premium: max 16)';
COMMENT ON COLUMN public.profiles.graphs_used_today IS 'Number of graphs generated today (Free: max 4, Premium: max 15)';