-- Make prospect_whatsapp and scheduled_at optional for set creation
-- (allows AI-paste flow where these fields may not be present in pasted text)

ALTER TABLE public.sets ALTER COLUMN prospect_whatsapp DROP NOT NULL;
ALTER TABLE public.sets ALTER COLUMN scheduled_at DROP NOT NULL;
