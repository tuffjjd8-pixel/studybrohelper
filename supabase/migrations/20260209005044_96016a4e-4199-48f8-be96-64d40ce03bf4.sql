
-- Drop old feature_flags table
DROP TABLE IF EXISTS public.feature_flags;

-- Create admin_controls table
CREATE TABLE public.admin_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  visible_for_users boolean NOT NULL DEFAULT false,
  visible_for_admin boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_controls ENABLE ROW LEVEL SECURITY;

-- Anyone can read controls (needed for UI filtering)
CREATE POLICY "Anyone can read admin controls"
ON public.admin_controls FOR SELECT
USING (true);

-- Only admin can modify
CREATE POLICY "Only admin can update admin controls"
ON public.admin_controls FOR UPDATE
USING (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can insert admin controls"
ON public.admin_controls FOR INSERT
WITH CHECK (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can delete admin controls"
ON public.admin_controls FOR DELETE
USING (is_poll_admin(auth.uid()));

-- Seed controls
INSERT INTO public.admin_controls (feature_key, visible_for_users, visible_for_admin) VALUES
  ('nav_home', true, true),
  ('nav_history', true, true),
  ('nav_quiz', true, true),
  ('nav_results', true, true),
  ('nav_polls', true, true),
  ('nav_profile', true, true),
  ('solve_followups', true, true),
  ('solve_strict_count', false, true),
  ('home_speech_to_text', true, true),
  ('home_animated_steps', true, true),
  ('community_goal', false, true);

-- Create community_goal_content table
CREATE TABLE public.community_goal_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  visible boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_goal_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community goal"
ON public.community_goal_content FOR SELECT
USING (true);

CREATE POLICY "Only admin can update community goal"
ON public.community_goal_content FOR UPDATE
USING (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can insert community goal"
ON public.community_goal_content FOR INSERT
WITH CHECK (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can delete community goal"
ON public.community_goal_content FOR DELETE
USING (is_poll_admin(auth.uid()));

-- Seed a default community goal
INSERT INTO public.community_goal_content (title, body, visible) VALUES
  ('🎯 Community Goal', 'Help us reach 1,000 solves this week!', false);
