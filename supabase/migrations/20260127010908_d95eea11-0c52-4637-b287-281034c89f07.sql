-- Add device_id to poll_votes for device-locked voting
ALTER TABLE public.poll_votes 
ADD COLUMN IF NOT EXISTS device_id text,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Create unique constraint to prevent duplicate votes per poll by user OR device
CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_poll_user_unique 
ON public.poll_votes (poll_id, voter_id);

CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_poll_device_unique 
ON public.poll_votes (poll_id, device_id) 
WHERE device_id IS NOT NULL;

-- Create poll_views table for unique view tracking
CREATE TABLE IF NOT EXISTS public.poll_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid,
  device_id text,
  first_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT poll_views_unique_user UNIQUE (poll_id, user_id),
  CONSTRAINT poll_views_unique_device UNIQUE (poll_id, device_id)
);

-- Enable RLS on poll_views
ALTER TABLE public.poll_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_views
CREATE POLICY "Anyone can insert views"
ON public.poll_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admin can view poll_views"
ON public.poll_views FOR SELECT
USING (is_poll_admin(auth.uid()));

CREATE POLICY "No one can update views"
ON public.poll_views FOR UPDATE
USING (false);

CREATE POLICY "No one can delete views"
ON public.poll_views FOR DELETE
USING (false);

-- Update get_poll_analytics function to include premium/free breakdown and unique views
CREATE OR REPLACE FUNCTION public.get_poll_analytics(poll_id_param uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'poll_id', poll_id_param,
    'total_views', COALESCE((SELECT COUNT(*) FROM poll_views WHERE poll_id = poll_id_param), 0),
    'unique_views', COALESCE((SELECT COUNT(DISTINCT COALESCE(user_id::text, device_id)) FROM poll_views WHERE poll_id = poll_id_param), 0),
    'total_votes', COALESCE((SELECT COUNT(*) FROM poll_votes WHERE poll_id = poll_id_param), 0),
    'total_conversions', COALESCE((SELECT COUNT(*) FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion'), 0),
    'vote_distribution', COALESCE(
      (SELECT jsonb_object_agg(option_index::text, count) 
       FROM (SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = poll_id_param GROUP BY option_index) sub),
      '{}'::jsonb
    ),
    'conversion_targets', COALESCE(
      (SELECT jsonb_object_agg(conversion_target, count)
       FROM (SELECT conversion_target, COUNT(*) as count FROM poll_analytics WHERE poll_id = poll_id_param AND event_type = 'conversion' AND conversion_target IS NOT NULL GROUP BY conversion_target) sub),
      '{}'::jsonb
    ),
    'unique_voters', COALESCE((SELECT COUNT(DISTINCT COALESCE(voter_id, device_id)) FROM poll_votes WHERE poll_id = poll_id_param), 0),
    'premium_votes', COALESCE((SELECT COUNT(*) FROM poll_votes WHERE poll_id = poll_id_param AND is_premium = true), 0),
    'free_votes', COALESCE((SELECT COUNT(*) FROM poll_votes WHERE poll_id = poll_id_param AND is_premium = false), 0)
  );
$$;

-- Create function to check if user/device already voted
CREATE OR REPLACE FUNCTION public.check_vote_exists(poll_id_param uuid, voter_id_param text, device_id_param text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.poll_votes
    WHERE poll_id = poll_id_param
    AND (voter_id = voter_id_param OR (device_id = device_id_param AND device_id_param IS NOT NULL))
  );
$$;

-- Create function to record unique view
CREATE OR REPLACE FUNCTION public.record_poll_view(poll_id_param uuid, user_id_param uuid, device_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert, ignore if already exists
  INSERT INTO public.poll_views (poll_id, user_id, device_id)
  VALUES (poll_id_param, user_id_param, device_id_param)
  ON CONFLICT DO NOTHING;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;