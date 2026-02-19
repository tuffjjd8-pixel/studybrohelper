
-- Create share_likes table for screenshot submissions
CREATE TABLE public.share_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  screenshot_url TEXT NOT NULL,
  likes_claimed INTEGER NOT NULL DEFAULT 0,
  likes_confirmed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.share_likes ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view their own share likes"
ON public.share_likes FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert their own share likes"
ON public.share_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can view all submissions
CREATE POLICY "Admin can view all share likes"
ON public.share_likes FOR SELECT
USING (is_poll_admin(auth.uid()));

-- Admin can update submissions (approve/reject)
CREATE POLICY "Admin can update share likes"
ON public.share_likes FOR UPDATE
USING (is_poll_admin(auth.uid()));

-- Admin can delete submissions
CREATE POLICY "Admin can delete share likes"
ON public.share_likes FOR DELETE
USING (is_poll_admin(auth.uid()));

-- Create storage bucket for share screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('share-screenshots', 'share-screenshots', true);

-- Storage policies for share screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'share-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view share screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'share-screenshots');

CREATE POLICY "Users can update their own screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'share-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
