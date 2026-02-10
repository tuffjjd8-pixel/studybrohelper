
-- Table to log every API request for usage tracking and cost estimation
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id text,
  request_type text NOT NULL, -- 'solve', 'follow_up', 'humanize', 'quiz', 'transcribe'
  estimated_cost numeric(10,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can read logs
CREATE POLICY "Only admin can view usage logs"
ON public.api_usage_logs FOR SELECT
USING (is_poll_admin(auth.uid()));

-- No direct insert/update/delete from client - only via service role in edge functions
CREATE POLICY "No client inserts"
ON public.api_usage_logs FOR INSERT
WITH CHECK (false);

CREATE POLICY "No client updates"
ON public.api_usage_logs FOR UPDATE
USING (false);

CREATE POLICY "No client deletes"
ON public.api_usage_logs FOR DELETE
USING (false);

-- Indexes for efficient querying
CREATE INDEX idx_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX idx_usage_logs_request_type ON public.api_usage_logs(request_type);
CREATE INDEX idx_usage_logs_user_id ON public.api_usage_logs(user_id);
