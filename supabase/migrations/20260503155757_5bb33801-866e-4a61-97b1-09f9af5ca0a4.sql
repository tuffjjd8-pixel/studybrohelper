
-- 1. app_settings: restrict SELECT, add is_public flag for safe rows
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Public can read public settings"
ON public.app_settings FOR SELECT
USING (is_public = true OR public.is_poll_admin(auth.uid()));

-- Mark frontend-needed keys as public
UPDATE public.app_settings
SET is_public = true
WHERE key IN ('reward_claiming_enabled', 'enable_reward_screen');

-- 2. profiles: prevent users from changing privileged columns via trigger
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / no auth context bypasses (auth.uid() is NULL there)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Admins can change anything
  IF public.is_poll_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Regular authenticated users: lock down monetization/identity columns
  NEW.is_premium := OLD.is_premium;
  NEW.premium_until := OLD.premium_until;
  NEW.subscription_id := OLD.subscription_id;
  NEW.email_verified := OLD.email_verified;
  NEW.renewal_date := OLD.renewal_date;
  NEW.referral_count := OLD.referral_count;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- 3. solve_usage: remove broad client UPDATE access (only service role updates counters)
DROP POLICY IF EXISTS "Users can update their own solve usage" ON public.solve_usage;

-- 4. Rebuild public_polls view with SECURITY INVOKER so RLS applies to caller
DROP VIEW IF EXISTS public.public_polls;
CREATE VIEW public.public_polls
WITH (security_invoker = true) AS
SELECT id, title, description, options, is_public, created_at, ends_at, total_votes, image_url
FROM public.polls
WHERE is_public = true;

-- Allow public read of public polls (was previously blocked by polls RLS)
DROP POLICY IF EXISTS "Anyone can view public polls" ON public.polls;
CREATE POLICY "Anyone can view public polls"
ON public.polls FOR SELECT
USING (is_public = true);
