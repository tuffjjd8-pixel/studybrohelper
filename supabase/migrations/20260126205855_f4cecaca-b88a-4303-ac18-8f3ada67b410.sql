-- Create poll_analytics table for tracking engagement (admin-only access)
CREATE TABLE IF NOT EXISTS public.poll_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'vote', 'conversion'
  user_id UUID,
  option_index INTEGER,
  conversion_target TEXT, -- e.g., 'summarizeHistory', 'quiz', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_poll_analytics_poll_id ON public.poll_analytics(poll_id);
CREATE INDEX idx_poll_analytics_event_type ON public.poll_analytics(event_type);
CREATE INDEX idx_poll_analytics_created_at ON public.poll_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.poll_analytics ENABLE ROW LEVEL SECURITY;

-- Only poll admin can view analytics
CREATE POLICY "Only poll admin can view analytics"
ON public.poll_analytics
FOR SELECT
USING (is_poll_admin(auth.uid()));

-- Only poll admin can insert analytics (or service role for automated tracking)
CREATE POLICY "Only poll admin can insert analytics"
ON public.poll_analytics
FOR INSERT
WITH CHECK (is_poll_admin(auth.uid()) OR auth.uid() IS NOT NULL);

-- No one can update or delete analytics (immutable audit log)
CREATE POLICY "No one can update analytics"
ON public.poll_analytics
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete analytics"
ON public.poll_analytics
FOR DELETE
USING (false);

-- Add views count to polls table
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

-- Create function to get poll analytics summary (admin only)
CREATE OR REPLACE FUNCTION public.get_poll_analytics(poll_id_param UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'poll_id', poll_id_param,
    'total_views', COALESCE((SELECT COUNT(*) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'view'), 0),
    'total_votes', COALESCE((SELECT COUNT(*) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'vote'), 0),
    'total_conversions', COALESCE((SELECT COUNT(*) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion'), 0),
    'vote_distribution', COALESCE(
      (SELECT jsonb_object_agg(option_index::text, count) 
       FROM (SELECT option_index, COUNT(*) as count FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'vote' GROUP BY option_index) sub),
      '{}'::jsonb
    ),
    'conversion_targets', COALESCE(
      (SELECT jsonb_object_agg(conversion_target, count)
       FROM (SELECT conversion_target, COUNT(*) as count FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion' AND conversion_target IS NOT NULL GROUP BY conversion_target) sub),
      '{}'::jsonb
    ),
    'unique_voters', COALESCE((SELECT COUNT(DISTINCT user_id) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'vote'), 0)
  );
$$;