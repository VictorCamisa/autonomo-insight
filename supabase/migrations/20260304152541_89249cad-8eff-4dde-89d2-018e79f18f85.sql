
-- Add per-vehicle portal flags
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS portal_ml boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS portal_np boolean NOT NULL DEFAULT false;

-- Global portal settings (which portals are enabled in the UI)
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_key text UNIQUE NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read portal_settings" ON public.portal_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage portal_settings" ON public.portal_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default portals
INSERT INTO public.portal_settings (portal_key, is_enabled) VALUES ('mercadolivre', false), ('napista', false) ON CONFLICT (portal_key) DO NOTHING;
