
-- Create user_entitlements table
CREATE TABLE public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_premium boolean NOT NULL DEFAULT false,
  unlimited_solves boolean NOT NULL DEFAULT false,
  unlimited_steps boolean NOT NULL DEFAULT false,
  unlimited_followups boolean NOT NULL DEFAULT false,
  unlimited_humanize boolean NOT NULL DEFAULT false,
  unlimited_regenerations boolean NOT NULL DEFAULT false,
  unlimited_history boolean NOT NULL DEFAULT false,
  unlimited_speech boolean NOT NULL DEFAULT false,
  deep_mode boolean NOT NULL DEFAULT false,
  priority_speed boolean NOT NULL DEFAULT false,
  premium_badge boolean NOT NULL DEFAULT false,
  no_ads boolean NOT NULL DEFAULT false,
  community_rewards boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can view their own entitlements
CREATE POLICY "Users can view own entitlements"
ON public.user_entitlements FOR SELECT
USING (auth.uid() = user_id);

-- No client writes - managed by trigger
CREATE POLICY "No client inserts on entitlements"
ON public.user_entitlements FOR INSERT
WITH CHECK (false);

CREATE POLICY "No client updates on entitlements"
ON public.user_entitlements FOR UPDATE
USING (false);

CREATE POLICY "No client deletes on entitlements"
ON public.user_entitlements FOR DELETE
USING (false);

-- Trigger function to auto-sync entitlements when profiles.is_premium changes
CREATE OR REPLACE FUNCTION public.sync_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_entitlements (
    user_id, is_premium,
    unlimited_solves, unlimited_steps, unlimited_followups,
    unlimited_humanize, unlimited_regenerations, unlimited_history,
    unlimited_speech, deep_mode, priority_speed, premium_badge,
    no_ads, community_rewards
  ) VALUES (
    NEW.user_id, NEW.is_premium,
    NEW.is_premium, NEW.is_premium, NEW.is_premium,
    NEW.is_premium, NEW.is_premium, NEW.is_premium,
    NEW.is_premium, NEW.is_premium, NEW.is_premium, NEW.is_premium,
    NEW.is_premium, NEW.is_premium
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_premium = NEW.is_premium,
    unlimited_solves = NEW.is_premium,
    unlimited_steps = NEW.is_premium,
    unlimited_followups = NEW.is_premium,
    unlimited_humanize = NEW.is_premium,
    unlimited_regenerations = NEW.is_premium,
    unlimited_history = NEW.is_premium,
    unlimited_speech = NEW.is_premium,
    deep_mode = NEW.is_premium,
    priority_speed = NEW.is_premium,
    premium_badge = NEW.is_premium,
    no_ads = NEW.is_premium,
    community_rewards = NEW.is_premium,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_entitlements_on_profile_change
AFTER INSERT OR UPDATE OF is_premium ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_entitlements();
