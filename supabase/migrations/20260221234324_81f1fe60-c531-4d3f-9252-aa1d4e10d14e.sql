
-- Add current and target columns to community_goal_content
ALTER TABLE public.community_goal_content
  ADD COLUMN IF NOT EXISTS current_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_count integer NOT NULL DEFAULT 100;

-- Create community goal submissions table
CREATE TABLE public.community_goal_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.community_goal_content(id) ON DELETE CASCADE,
  screenshot_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  downloads_count integer NOT NULL DEFAULT 0,
  admin_note text,
  disqualified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.community_goal_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.community_goal_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON public.community_goal_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all submissions
CREATE POLICY "Admin can view all submissions"
  ON public.community_goal_submissions FOR SELECT
  USING (is_poll_admin(auth.uid()));

-- Admin can update submissions
CREATE POLICY "Admin can update submissions"
  ON public.community_goal_submissions FOR UPDATE
  USING (is_poll_admin(auth.uid()));

-- Admin can delete submissions
CREATE POLICY "Admin can delete submissions"
  ON public.community_goal_submissions FOR DELETE
  USING (is_poll_admin(auth.uid()));

-- Create storage bucket for goal proof screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-proofs', 'goal-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for goal-proofs bucket
CREATE POLICY "Users can upload goal proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'goal-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view goal proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'goal-proofs');

CREATE POLICY "Users can delete own goal proofs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'goal-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
