-- AdvanceOS: Full Database Schema
-- All tables, indexes, triggers, and RLS policies

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  whatsapp text NOT NULL DEFAULT '',
  bac_account_encrypted text,
  role text NOT NULL DEFAULT 'delivery' CHECK (role IN ('setter', 'closer', 'admin', 'delivery')),
  salary numeric(12,2),
  salary_notes text,
  admin_notes text,
  active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp, bac_account_encrypted)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    NEW.raw_user_meta_data->>'bac_account'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SETS
-- ============================================================
CREATE TABLE public.sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name text NOT NULL,
  prospect_whatsapp text NOT NULL,
  prospect_ig text NOT NULL,
  prospect_web text,
  setter_id uuid NOT NULL REFERENCES public.profiles(id),
  closer_id uuid NOT NULL REFERENCES public.profiles(id),
  scheduled_at timestamptz NOT NULL,
  summary text NOT NULL,
  service_offered text NOT NULL CHECK (service_offered IN ('advance90', 'meta_advance')),
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN (
    'agendado', 'precall_enviado', 'reagendo', 'no_show',
    'seguimiento', 'descalificado', 'closed', 'closed_pendiente'
  )),
  is_duplicate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sets_status ON public.sets(status);
CREATE INDEX idx_sets_setter ON public.sets(setter_id);
CREATE INDEX idx_sets_closer ON public.sets(closer_id);
CREATE INDEX idx_sets_scheduled ON public.sets(scheduled_at);
CREATE INDEX idx_sets_ig ON public.sets(prospect_ig);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sets_updated_at
  BEFORE UPDATE ON public.sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SET STATUS HISTORY (audit trail)
-- ============================================================
CREATE TABLE public.set_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_set_status_history_set ON public.set_status_history(set_id);

-- ============================================================
-- DEALS
-- ============================================================
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('closed', 'follow_up', 'descalificado')),
  service_sold text CHECK (service_sold IN ('advance90', 'meta_advance', 'retencion')),
  revenue_total numeric(12,2),
  follow_up_date timestamptz,
  follow_up_notes text,
  disqualified_reason text,
  phantom_link text,
  closer_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_set ON public.deals(set_id);
CREATE INDEX idx_deals_outcome ON public.deals(outcome);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  set_id uuid NOT NULL REFERENCES public.sets(id),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  whatsapp text NOT NULL,
  ig text NOT NULL,
  web text,
  service text NOT NULL CHECK (service IN ('advance90', 'meta_advance', 'retencion')),
  status text NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'activo', 'pausado', 'completado')),
  assigned_to uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_service ON public.clients(service);
CREATE INDEX idx_clients_assigned ON public.clients(assigned_to);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.sets(id),
  client_id uuid REFERENCES public.clients(id),
  amount_gross numeric(12,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('transferencia', 'sinpe', 'tilopay', 'crypto', 'otro')),
  tilopay_installment_months integer CHECK (tilopay_installment_months IN (3, 6, 12)),
  fee_percentage numeric(5,4) NOT NULL DEFAULT 0,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount_net numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_set ON public.payments(set_id);
CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL CHECK (role IN ('setter', 'closer')),
  percentage numeric(5,4) NOT NULL,
  amount numeric(12,2) NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commissions_payment ON public.commissions(payment_id);
CREATE INDEX idx_commissions_member ON public.commissions(team_member_id);
CREATE INDEX idx_commissions_paid ON public.commissions(is_paid);

-- ============================================================
-- ONBOARDING CHECKLIST
-- ============================================================
CREATE TABLE public.onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  UNIQUE(client_id, item_key)
);

CREATE INDEX idx_onboarding_client ON public.onboarding_checklist(client_id);

-- ============================================================
-- CLIENT FORMS
-- ============================================================
CREATE TABLE public.client_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_type text NOT NULL CHECK (business_type IN (
    'producto', 'servicio', 'restaurante', 'software', 'salud', 'real_estate'
  )),
  form_data jsonb NOT NULL DEFAULT '{}',
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_forms_client ON public.client_forms(client_id);

-- ============================================================
-- ADVANCE90 PHASES
-- ============================================================
CREATE TABLE public.advance90_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  start_day integer NOT NULL,
  end_day integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completado')),
  "order" integer NOT NULL
);

CREATE INDEX idx_advance90_client ON public.advance90_phases(client_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.advance90_phases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id),
  due_date date,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'bloqueado', 'listo')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);

-- ============================================================
-- CLIENT ASSETS
-- ============================================================
CREATE TABLE public.client_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('guion', 'video', 'diseno', 'link', 'otro')),
  name text NOT NULL,
  url text NOT NULL,
  notes text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_assets_client ON public.client_assets(client_id);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('ads', 'software', 'oficina', 'otro')),
  description text NOT NULL,
  amount_usd numeric(12,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- ============================================================
-- AD SPEND
-- ============================================================
CREATE TABLE public.ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_usd numeric(12,2) NOT NULL,
  platform text NOT NULL DEFAULT 'meta',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_spend_period ON public.ad_spend(period_start, period_end);

-- ============================================================
-- SALARY PAYMENTS
-- ============================================================
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.profiles(id),
  period_label text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_payments_member ON public.salary_payments(team_member_id);
CREATE INDEX idx_salary_payments_status ON public.salary_payments(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  action_url text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- ============================================================
-- EXCHANGE RATES
-- ============================================================
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  usd_to_crc numeric(10,2) NOT NULL,
  source text NOT NULL DEFAULT 'bccr',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all active profiles"
  ON public.profiles FOR SELECT
  USING (active = true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin' OR id = auth.uid());

-- SETS
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Setter can view own sets"
  ON public.sets FOR SELECT
  USING (
    setter_id = auth.uid()
    OR closer_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Setter can create sets"
  ON public.sets FOR INSERT
  WITH CHECK (
    setter_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Closer and admin can update sets"
  ON public.sets FOR UPDATE
  USING (
    closer_id = auth.uid()
    OR setter_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

-- SET STATUS HISTORY
ALTER TABLE public.set_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone involved can view set history"
  ON public.set_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sets s
      WHERE s.id = set_id
      AND (s.setter_id = auth.uid() OR s.closer_id = auth.uid() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert set history"
  ON public.set_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- DEALS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View deals for involved sets"
  ON public.deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sets s
      WHERE s.id = set_id
      AND (s.setter_id = auth.uid() OR s.closer_id = auth.uid() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Closer and admin can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sets s
      WHERE s.id = set_id
      AND (s.closer_id = auth.uid() OR public.get_user_role() = 'admin')
    )
  );

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view clients"
  ON public.clients FOR SELECT
  USING (
    public.get_user_role() IN ('closer', 'delivery', 'admin')
  );

CREATE POLICY "Admin and closer can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('closer', 'admin')
  );

CREATE POLICY "Admin, closer, delivery can update clients"
  ON public.clients FOR UPDATE
  USING (
    public.get_user_role() IN ('closer', 'delivery', 'admin')
  );

-- PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View payments for involved sets"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sets s
      WHERE s.id = set_id
      AND (s.setter_id = auth.uid() OR s.closer_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Admin and closer can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('closer', 'admin')
  );

-- COMMISSIONS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions"
  ON public.commissions FOR SELECT
  USING (
    team_member_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "System can create commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can update commissions"
  ON public.commissions FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- ONBOARDING CHECKLIST
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view checklists"
  ON public.onboarding_checklist FOR SELECT
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

CREATE POLICY "Closer, delivery, admin can manage checklists"
  ON public.onboarding_checklist FOR ALL
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

-- CLIENT FORMS
ALTER TABLE public.client_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view forms"
  ON public.client_forms FOR SELECT
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

CREATE POLICY "Closer, delivery, admin can manage forms"
  ON public.client_forms FOR ALL
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

-- ADVANCE90 PHASES
ALTER TABLE public.advance90_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view phases"
  ON public.advance90_phases FOR SELECT
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

CREATE POLICY "Admin can manage phases"
  ON public.advance90_phases FOR ALL
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view tasks"
  ON public.tasks FOR SELECT
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

CREATE POLICY "Closer, delivery, admin can manage tasks"
  ON public.tasks FOR ALL
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

-- CLIENT ASSETS
ALTER TABLE public.client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closer, delivery, admin can view assets"
  ON public.client_assets FOR SELECT
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

CREATE POLICY "Closer, delivery, admin can manage assets"
  ON public.client_assets FOR ALL
  USING (public.get_user_role() IN ('closer', 'delivery', 'admin'));

-- EXPENSES
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view expenses"
  ON public.expenses FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admin can manage expenses"
  ON public.expenses FOR ALL
  USING (public.get_user_role() = 'admin');

-- AD SPEND
ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view ad spend"
  ON public.ad_spend FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admin can manage ad spend"
  ON public.ad_spend FOR ALL
  USING (public.get_user_role() = 'admin');

-- SALARY PAYMENTS
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view salary payments"
  ON public.salary_payments FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can view own salary payments"
  ON public.salary_payments FOR SELECT
  USING (team_member_id = auth.uid());

CREATE POLICY "Admin can manage salary payments"
  ON public.salary_payments FOR ALL
  USING (public.get_user_role() = 'admin');

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ACTIVITY LOG
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- EXCHANGE RATES
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage exchange rates"
  ON public.exchange_rates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR public.get_user_role() = 'admin');
