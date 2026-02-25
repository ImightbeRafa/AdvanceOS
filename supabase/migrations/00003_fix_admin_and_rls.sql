-- Fix 1: Set existing user ralauas@gmail.com as admin
UPDATE public.profiles SET role = 'admin' WHERE email = 'ralauas@gmail.com';

-- Fix 2: Fix RLS SELECT policy on profiles
-- Users must always be able to read their own profile (even if inactive)
DROP POLICY IF EXISTS "Users can view all active profiles" ON public.profiles;

CREATE POLICY "Users can view active profiles and own"
  ON public.profiles FOR SELECT
  USING (active = true OR id = auth.uid());
