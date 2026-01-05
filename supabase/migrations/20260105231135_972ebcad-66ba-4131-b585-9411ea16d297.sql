-- Create an enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is poll admin by email
CREATE OR REPLACE FUNCTION public.is_poll_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'apexwavesstudios@gmail.com'
  )
$$;

-- RLS policies for user_roles - only admins can see roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Update polls policies to use the new function
DROP POLICY IF EXISTS "Authenticated users can insert polls if admin" ON public.polls;
DROP POLICY IF EXISTS "Authenticated users can update polls if admin" ON public.polls;
DROP POLICY IF EXISTS "Authenticated users can delete polls if admin" ON public.polls;

-- New secure policies for polls
CREATE POLICY "Only poll admin can insert polls"
ON public.polls
FOR INSERT
WITH CHECK (public.is_poll_admin(auth.uid()));

CREATE POLICY "Only poll admin can update polls"
ON public.polls
FOR UPDATE
USING (public.is_poll_admin(auth.uid()));

CREATE POLICY "Only poll admin can delete polls"
ON public.polls
FOR DELETE
USING (public.is_poll_admin(auth.uid()));