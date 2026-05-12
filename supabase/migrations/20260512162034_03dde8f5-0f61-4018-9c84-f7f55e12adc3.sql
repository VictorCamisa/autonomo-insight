
-- ai_agents
DROP POLICY IF EXISTS "Allow all for ai_agents" ON public.ai_agents;
CREATE POLICY "Staff manage ai_agents" ON public.ai_agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- ai_agent_tools
DROP POLICY IF EXISTS "Allow all for ai_agent_tools" ON public.ai_agent_tools;
CREATE POLICY "Staff manage ai_agent_tools" ON public.ai_agent_tools
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- ai_agent_conversations
DROP POLICY IF EXISTS "Allow all for ai_agent_conversations" ON public.ai_agent_conversations;
CREATE POLICY "Staff view ai_agent_conversations" ON public.ai_agent_conversations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Managers manage ai_agent_conversations" ON public.ai_agent_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- ai_agent_messages
DROP POLICY IF EXISTS "Allow all for ai_agent_messages" ON public.ai_agent_messages;
CREATE POLICY "Staff view ai_agent_messages" ON public.ai_agent_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Managers manage ai_agent_messages" ON public.ai_agent_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- whatsapp_messages: remove anonymous insert/update
DROP POLICY IF EXISTS "Sistema pode inserir mensagens" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Sistema pode atualizar status mensagens" ON public.whatsapp_messages;
CREATE POLICY "Staff update whatsapp_messages" ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.is_master_user(auth.uid())
    OR sent_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    OR public.is_master_user(auth.uid())
    OR sent_by = auth.uid()
  );

-- contracts
DROP POLICY IF EXISTS "Users can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete contracts" ON public.contracts;
CREATE POLICY "Staff view contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Staff create contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Staff update contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.is_master_user(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Managers delete contracts" ON public.contracts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- lead_qualification_data
DROP POLICY IF EXISTS "Users can view lead qualification data" ON public.lead_qualification_data;
DROP POLICY IF EXISTS "Users can insert lead qualification data" ON public.lead_qualification_data;
DROP POLICY IF EXISTS "Users can update lead qualification data" ON public.lead_qualification_data;
CREATE POLICY "Staff view lead qualification data" ON public.lead_qualification_data
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Staff insert lead qualification data" ON public.lead_qualification_data
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  );
CREATE POLICY "Staff update lead qualification data" ON public.lead_qualification_data
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'vendedor')
    OR public.has_role(auth.uid(), 'marketing')
    OR public.is_master_user(auth.uid())
  );

-- vehicle_transactions: restrict to managers/master
DROP POLICY IF EXISTS "Authenticated users can view vehicle transactions" ON public.vehicle_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert vehicle transactions" ON public.vehicle_transactions;
DROP POLICY IF EXISTS "Authenticated users can update vehicle transactions" ON public.vehicle_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle transactions" ON public.vehicle_transactions;
CREATE POLICY "Managers view vehicle_transactions" ON public.vehicle_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));
CREATE POLICY "Managers insert vehicle_transactions" ON public.vehicle_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));
CREATE POLICY "Managers update vehicle_transactions" ON public.vehicle_transactions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));
CREATE POLICY "Managers delete vehicle_transactions" ON public.vehicle_transactions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR public.is_master_user(auth.uid()));

-- phone_locks: enable RLS (only edge functions with service role need it)
ALTER TABLE public.phone_locks ENABLE ROW LEVEL SECURITY;

-- salesperson_ranking view: switch to security_invoker
ALTER VIEW public.salesperson_ranking SET (security_invoker = true);
