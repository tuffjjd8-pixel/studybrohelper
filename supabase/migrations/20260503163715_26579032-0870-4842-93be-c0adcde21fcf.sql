
-- ============================================================
-- 1. Lock down profiles UPDATE: prevent privilege escalation
--    Trigger protect_profile_privileged_columns_trg already
--    enforces this server-side. Keep trigger; tighten policy too
--    so the WITH CHECK matches.
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- The protect_profile_privileged_columns trigger forces is_premium,
-- premium_until, subscription_id, email_verified, renewal_date,
-- referral_count, referral_code, referred_by back to OLD values for
-- non-admin authenticated callers. Confirm trigger still attached:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'protect_profile_privileged_columns_trg'
  ) THEN
    CREATE TRIGGER protect_profile_privileged_columns_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();
  END IF;
END $$;

-- ============================================================
-- 2. solve_usage: block client UPDATE (no quota reset by users)
-- ============================================================
DROP POLICY IF EXISTS "No client updates on solve_usage" ON public.solve_usage;
CREATE POLICY "No client updates on solve_usage"
ON public.solve_usage
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

-- ============================================================
-- 3. app_settings: only expose rows flagged is_public=true to clients
--    Replace permissive public read with is_public-or-admin policy.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read public settings" ON public.app_settings;
CREATE POLICY "Public can read public settings"
ON public.app_settings
FOR SELECT
TO public
USING (is_public = true OR public.is_poll_admin(auth.uid()));

-- ============================================================
-- 5. Security Definer hardening: revoke EXECUTE on internal
--    SECURITY DEFINER functions from anon / authenticated.
--    These are only meant to run from triggers or service role.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_referral_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_premium_expiry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_entitlements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_referral(uuid) FROM PUBLIC, anon;

-- public_polls view already has security_invoker=true; ensure it stays that way
ALTER VIEW IF EXISTS public.public_polls SET (security_invoker = true);
