-- Shared dashboard: allow all team members (setter, closer, admin) to SEE all
-- sets, deals, payments and commissions.  Only SELECT policies are changed;
-- INSERT / UPDATE / DELETE policies remain unchanged.

-- ============================================================
-- SETS — any authenticated team member can view all sets
-- ============================================================
DROP POLICY IF EXISTS "Setter can view own sets" ON public.sets;

CREATE POLICY "Team can view all sets"
  ON public.sets FOR SELECT
  USING (
    public.get_user_role() IN ('setter', 'closer', 'admin')
  );

-- ============================================================
-- DEALS — any authenticated team member can view all deals
-- ============================================================
DROP POLICY IF EXISTS "View deals for involved sets" ON public.deals;

CREATE POLICY "Team can view all deals"
  ON public.deals FOR SELECT
  USING (
    public.get_user_role() IN ('setter', 'closer', 'admin')
  );

-- ============================================================
-- PAYMENTS — any authenticated team member can view all payments
-- ============================================================
DROP POLICY IF EXISTS "View payments for involved sets" ON public.payments;

CREATE POLICY "Team can view all payments"
  ON public.payments FOR SELECT
  USING (
    public.get_user_role() IN ('setter', 'closer', 'admin')
  );

-- ============================================================
-- COMMISSIONS — team members can view all commissions
-- (needed to display commission splits on the dashboard)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;

CREATE POLICY "Team can view all commissions"
  ON public.commissions FOR SELECT
  USING (
    public.get_user_role() IN ('setter', 'closer', 'admin')
  );
