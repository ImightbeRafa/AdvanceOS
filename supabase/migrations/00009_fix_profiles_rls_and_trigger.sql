-- Fix 1: Profiles SELECT RLS — users must always see their own profile (even if inactive)
-- Migration 00008 removed `id = auth.uid()`, causing an infinite redirect loop
-- for inactive non-admin users (middleware can't read profile → layout redirects to /login → middleware redirects back).

DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  USING (
    active = true
    OR id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

-- Fix 2: Secure handle_new_user trigger — prevent role escalation via user metadata.
-- Only allow role from metadata if it's a valid non-admin role.
-- Admin role must be granted explicitly via the profiles table by an existing admin.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'delivery');

  -- Guard: never allow admin role to be set via signup metadata
  IF _role NOT IN ('setter', 'closer', 'delivery') THEN
    _role := 'delivery';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, whatsapp, bac_account_encrypted)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    _role,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    NEW.raw_user_meta_data->>'bac_account'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
