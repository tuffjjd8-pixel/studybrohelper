
-- Feature flags table for admin-controlled feature visibility
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  enabled_for_all BOOLEAN NOT NULL DEFAULT false,
  enabled_for_admin BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (needed for visibility checks)
CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags FOR SELECT
USING (true);

-- Only admin can update
CREATE POLICY "Only admin can update feature flags"
ON public.feature_flags FOR UPDATE
USING (is_poll_admin(auth.uid()));

-- Only admin can insert
CREATE POLICY "Only admin can insert feature flags"
ON public.feature_flags FOR INSERT
WITH CHECK (is_poll_admin(auth.uid()));

-- Seed initial flags
INSERT INTO public.feature_flags (feature_name, enabled_for_all, enabled_for_admin) VALUES
  ('show_humanize', false, true),
  ('show_followups', false, true),
  ('show_graph_maker', false, true),
  ('show_advanced_results', false, true),
  ('show_extra_tools', false, true),
  ('show_community_goal', false, true);
