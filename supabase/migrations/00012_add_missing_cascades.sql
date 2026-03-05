-- Add ON DELETE CASCADE to foreign keys that were missing it.
-- Without these, deleting a set or client fails with FK violations
-- because child rows (clients, payments) block the parent delete.

-- 1. clients.deal_id → deals(id)  (was RESTRICT, now CASCADE)
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_deal_id_fkey,
  ADD CONSTRAINT clients_deal_id_fkey
    FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;

-- 2. clients.set_id → sets(id)  (was RESTRICT, now CASCADE)
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_set_id_fkey,
  ADD CONSTRAINT clients_set_id_fkey
    FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE CASCADE;

-- 3. payments.set_id → sets(id)  (was RESTRICT, now CASCADE)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_set_id_fkey,
  ADD CONSTRAINT payments_set_id_fkey
    FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE CASCADE;

-- 4. payments.client_id → clients(id)  (was RESTRICT, now CASCADE)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_client_id_fkey,
  ADD CONSTRAINT payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
