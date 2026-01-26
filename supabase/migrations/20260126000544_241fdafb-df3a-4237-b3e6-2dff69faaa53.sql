-- Create app_settings table for storing Stripe mode
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only poll admin can update settings
CREATE POLICY "Only admin can update settings"
ON public.app_settings
FOR UPDATE
USING (is_poll_admin(auth.uid()));

-- Only admin can insert settings
CREATE POLICY "Only admin can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (is_poll_admin(auth.uid()));

-- Insert default stripe mode
INSERT INTO public.app_settings (key, value) VALUES ('stripe_mode', 'live');