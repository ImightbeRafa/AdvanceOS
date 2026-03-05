-- Allow admin users to delete sets and related entities.
-- CASCADE foreign keys will automatically clean up child rows
-- (deals, set_status_history, payments → commissions, clients → onboarding/forms/phases/assets).

-- SETS
CREATE POLICY "Admin can delete sets"
  ON public.sets FOR DELETE
  USING (public.get_user_role() = 'admin');

-- DEALS
CREATE POLICY "Admin can delete deals"
  ON public.deals FOR DELETE
  USING (public.get_user_role() = 'admin');

-- CLIENTS
CREATE POLICY "Admin can delete clients"
  ON public.clients FOR DELETE
  USING (public.get_user_role() = 'admin');

-- PAYMENTS
CREATE POLICY "Admin can delete payments"
  ON public.payments FOR DELETE
  USING (public.get_user_role() = 'admin');

-- COMMISSIONS
CREATE POLICY "Admin can delete commissions"
  ON public.commissions FOR DELETE
  USING (public.get_user_role() = 'admin');

-- SET STATUS HISTORY
CREATE POLICY "Admin can delete set history"
  ON public.set_status_history FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ACTIVITY LOG
CREATE POLICY "Admin can delete activity log"
  ON public.activity_log FOR DELETE
  USING (public.get_user_role() = 'admin');
