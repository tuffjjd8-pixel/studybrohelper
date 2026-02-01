-- Add email_verified column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Create email_verification_codes table
CREATE TABLE public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for email_verification_codes
CREATE POLICY "Users can view their own verification codes" 
ON public.email_verification_codes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes" 
ON public.email_verification_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes" 
ON public.email_verification_codes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON public.email_verification_codes(code);
CREATE INDEX idx_verification_codes_email ON public.email_verification_codes(email);