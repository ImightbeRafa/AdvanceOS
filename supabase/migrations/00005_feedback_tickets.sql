-- ============================================================
-- FEEDBACK TICKETS
-- ============================================================
CREATE TABLE public.feedback_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  category text NOT NULL CHECK (category IN ('bug', 'sugerencia', 'pregunta', 'queja', 'otro')),
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_revision', 'resuelto', 'cerrado')),
  assigned_to uuid REFERENCES public.profiles(id),
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_tickets_user ON public.feedback_tickets(user_id);
CREATE INDEX idx_feedback_tickets_status ON public.feedback_tickets(status);
CREATE INDEX idx_feedback_tickets_category ON public.feedback_tickets(category);
CREATE INDEX idx_feedback_tickets_priority ON public.feedback_tickets(priority);

CREATE TRIGGER set_feedback_tickets_updated_at
  BEFORE UPDATE ON public.feedback_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FEEDBACK REPLIES
-- ============================================================
CREATE TABLE public.feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.feedback_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_replies_ticket ON public.feedback_replies(ticket_id);

-- ============================================================
-- RLS: FEEDBACK TICKETS
-- ============================================================
ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.feedback_tickets FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Authenticated users can create tickets"
  ON public.feedback_tickets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Admin can update any ticket"
  ON public.feedback_tickets FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- RLS: FEEDBACK REPLIES
-- ============================================================
ALTER TABLE public.feedback_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-internal replies on own tickets"
  ON public.feedback_replies FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.feedback_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can reply to own tickets"
  ON public.feedback_replies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      public.get_user_role() = 'admin'
      OR (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM public.feedback_tickets t
          WHERE t.id = ticket_id AND t.user_id = auth.uid()
        )
      )
    )
  );
