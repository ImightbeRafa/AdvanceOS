-- Allow admins to see ALL profiles (including inactive/deactivated)
-- Non-admin users can only see active profiles

DROP POLICY IF EXISTS "Users can view all active profiles" ON public.profiles;

CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  USING (active = true OR public.get_user_role() = 'admin');
