
-- Table for temporarily limited users
CREATE TABLE public.user_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view user_limits" ON public.user_limits
  FOR SELECT USING (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can insert user_limits" ON public.user_limits
  FOR INSERT WITH CHECK (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can delete user_limits" ON public.user_limits
  FOR DELETE USING (is_poll_admin(auth.uid()));

CREATE POLICY "No client updates on user_limits" ON public.user_limits
  FOR UPDATE USING (false);

-- Table for banned users
CREATE TABLE public.banned_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view banned_users" ON public.banned_users
  FOR SELECT USING (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can insert banned_users" ON public.banned_users
  FOR INSERT WITH CHECK (is_poll_admin(auth.uid()));

CREATE POLICY "Only admin can delete banned_users" ON public.banned_users
  FOR DELETE USING (is_poll_admin(auth.uid()));

CREATE POLICY "No client updates on banned_users" ON public.banned_users
  FOR UPDATE USING (false);

-- Helper function to check if a user is banned or limited (used by edge functions with service role)
CREATE OR REPLACE FUNCTION public.is_user_blocked(target_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'banned', EXISTS (SELECT 1 FROM banned_users WHERE user_id = target_user_id),
    'limited', EXISTS (SELECT 1 FROM user_limits WHERE user_id = target_user_id AND expires_at > now())
  );
$$;
