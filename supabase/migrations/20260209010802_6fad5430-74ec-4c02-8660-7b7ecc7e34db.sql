-- Fix: The SELECT policy on admin_controls is RESTRICTIVE, which means it can't grant access.
-- Non-admin users get 0 rows, so all controls default to visible.
-- Drop the restrictive policy and recreate as PERMISSIVE.

DROP POLICY IF EXISTS "Anyone can read admin controls" ON public.admin_controls;
CREATE POLICY "Anyone can read admin controls"
  ON public.admin_controls
  FOR SELECT
  USING (true);

-- Same fix for community_goal_content
DROP POLICY IF EXISTS "Anyone can read community goal" ON public.community_goal_content;
CREATE POLICY "Anyone can read community goal"
  ON public.community_goal_content
  FOR SELECT
  USING (true);

-- Same fix for app_settings
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings"
  ON public.app_settings
  FOR SELECT
  USING (true);