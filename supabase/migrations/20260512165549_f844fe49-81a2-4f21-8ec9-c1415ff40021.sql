
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings public read"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "site_settings master insert"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_user(auth.uid()));

CREATE POLICY "site_settings master update"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_master_user(auth.uid()))
  WITH CHECK (public.is_master_user(auth.uid()));

CREATE POLICY "site_settings master delete"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (public.is_master_user(auth.uid()));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES ('gtm_id', 'GTM-MGH7N9MX')
  ON CONFLICT (key) DO NOTHING;
