
-- Create security_events table for logging prompt injection attempts and suspicious activity
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  user_message text,
  user_id uuid,
  device_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admin can view security events
CREATE POLICY "Only admin can view security events"
  ON public.security_events FOR SELECT
  USING (is_poll_admin(auth.uid()));

-- No client writes - only edge functions via service role
CREATE POLICY "No client inserts on security_events"
  ON public.security_events FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No client updates on security_events"
  ON public.security_events FOR UPDATE
  USING (false);

CREATE POLICY "No client deletes on security_events"
  ON public.security_events FOR DELETE
  USING (is_poll_admin(auth.uid()));

-- Index for fast admin queries
CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events (severity);
