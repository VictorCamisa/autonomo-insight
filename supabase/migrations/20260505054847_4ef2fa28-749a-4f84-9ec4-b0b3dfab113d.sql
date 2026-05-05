
CREATE TYPE follow_up_exhausted_action AS ENUM ('notify_seller', 'mark_lost', 'mark_only');
CREATE TYPE follow_up_attempt_status AS ENUM ('pending', 'sent', 'failed', 'skipped', 'responded');

CREATE TABLE public.follow_up_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Repescagem padrão',
  is_active boolean NOT NULL DEFAULT true,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  on_exhausted follow_up_exhausted_action NOT NULL DEFAULT 'notify_seller',
  apply_to_statuses text[] NOT NULL DEFAULT ARRAY['atendimento_ia','negociando']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.follow_up_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.follow_up_campaigns(id) ON DELETE SET NULL,
  negotiation_id uuid REFERENCES public.negotiations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  attempt_number int NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status follow_up_attempt_status NOT NULL DEFAULT 'pending',
  message_content text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fua_negotiation ON public.follow_up_attempts(negotiation_id);
CREATE INDEX idx_fua_status_scheduled ON public.follow_up_attempts(status, scheduled_for);

ALTER TABLE public.follow_up_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read campaigns" ON public.follow_up_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage campaigns" ON public.follow_up_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read attempts" ON public.follow_up_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manage attempts" ON public.follow_up_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_fuc_updated BEFORE UPDATE ON public.follow_up_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fua_updated BEFORE UPDATE ON public.follow_up_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
