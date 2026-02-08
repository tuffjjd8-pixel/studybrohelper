
-- Table to track solve usage by device ID (for signed-out users) and user ID (for signed-in users)
CREATE TABLE public.solve_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  device_id TEXT,
  solves_used INTEGER NOT NULL DEFAULT 0,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT solve_usage_unique_user UNIQUE (user_id, usage_date),
  CONSTRAINT solve_usage_unique_device UNIQUE (device_id, usage_date),
  CONSTRAINT solve_usage_has_identity CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.solve_usage ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view/manage their own usage
CREATE POLICY "Users can view their own solve usage"
  ON public.solve_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solve usage"
  ON public.solve_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solve usage"
  ON public.solve_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_solve_usage_user_date ON public.solve_usage (user_id, usage_date);
CREATE INDEX idx_solve_usage_device_date ON public.solve_usage (device_id, usage_date);

-- Trigger for updated_at
CREATE TRIGGER update_solve_usage_updated_at
  BEFORE UPDATE ON public.solve_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
