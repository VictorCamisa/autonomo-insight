-- Allow null salesperson_id for negotiations awaiting qualification
ALTER TABLE public.negotiations ALTER COLUMN salesperson_id DROP NOT NULL;