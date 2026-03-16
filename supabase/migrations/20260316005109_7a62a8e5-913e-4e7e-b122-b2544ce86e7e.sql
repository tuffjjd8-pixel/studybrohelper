
CREATE TABLE public.pro_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_month TEXT NOT NULL,
  instant_solves INTEGER NOT NULL DEFAULT 0,
  deep_solves INTEGER NOT NULL DEFAULT 0,
  humanize_count INTEGER NOT NULL DEFAULT 0,
  followup_count INTEGER NOT NULL DEFAULT 0,
  quiz_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_month)
);

ALTER TABLE public.pro_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pro usage"
  ON public.pro_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "No client inserts on pro_usage"
  ON public.pro_usage FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "No client updates on pro_usage"
  ON public.pro_usage FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "No client deletes on pro_usage"
  ON public.pro_usage FOR DELETE
  TO public
  USING (false);
