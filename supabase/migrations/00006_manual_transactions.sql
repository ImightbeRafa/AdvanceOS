-- ============================================================
-- ENSURE profiles.role COLUMN EXISTS
-- (safe to re-run if it already exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role text NOT NULL DEFAULT 'delivery'
      CHECK (role IN ('setter', 'closer', 'admin', 'delivery'));

    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
  END IF;
END $$;

-- Ensure the get_user_role() helper exists
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- MANUAL TRANSACTIONS (income / deductions)
-- ============================================================
CREATE TABLE public.manual_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  description text NOT NULL,
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.manual_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_manual_transactions"
  ON public.manual_transactions FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');
