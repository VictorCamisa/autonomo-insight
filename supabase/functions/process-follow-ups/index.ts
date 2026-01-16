import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowUpStep {
  id: string;
  flow_id: string;
  step_order: number;
  delay_minutes: number;
  message_template: string;
  stop_if_qualified: boolean;
  stop_if_assigned_to_salesperson: boolean;
  stop_if_responded: boolean;
}

interface FollowUpFlow {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  target_lead_status: string[];
  target_lead_sources: string[];
  exclude_converted_leads: boolean;
  exclude_lost_leads: boolean;
  whatsapp_instance_id: string | null;
  steps: FollowUpStep[];
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string;
  assigned_to: string | null;
  created_at: string;
  vehicle_interest: string | null;
}

interface StepExecution {
  lead_id: string;
  flow_id: string;
  step_id: string;
  step_order: number;
  executed_at: string;
}

// Substitui variáveis no template
function processTemplate(template: string, lead: Lead, salespersonName?: string): string {
  let message = template;
  
  message = message.replace(/\{nome\}/gi, lead.name.split(' ')[0]);
  message = message.replace(/\{nome_completo\}/gi, lead.name);
  message = message.replace(/\{veiculo\}/gi, lead.vehicle_interest || 'veículo de interesse');
  
  if (salespersonName) {
    message = message.replace(/\{vendedor\}/gi, salespersonName);
  }
  
  return message;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Starting follow-up processing...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar fluxos ativos
    const { data: flowsData, error: flowsError } = await supabase
      .from('follow_up_flows')
      .select('*')
      .eq('is_active', true);

    if (flowsError) throw flowsError;
    
    if (!flowsData || flowsData.length === 0) {
      console.log('No active follow-up flows found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active flows', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${flowsData.length} active flows`);

    // 2. Buscar passos de cada fluxo
    const flowIds = flowsData.map(f => f.id);
    const { data: stepsData, error: stepsError } = await supabase
      .from('follow_up_steps')
      .select('*')
      .in('flow_id', flowIds)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    // Agrupar passos por fluxo
    const flows: FollowUpFlow[] = flowsData.map(flow => ({
      ...flow,
      steps: (stepsData || []).filter(s => s.flow_id === flow.id)
    }));

    // 3. Buscar leads elegíveis (não convertidos, não perdidos por padrão)
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .not('status', 'eq', 'converted');

    if (leadsError) throw leadsError;
    
    console.log(`Found ${leadsData?.length || 0} potential leads`);

    // 4. Buscar execuções existentes para não repetir
    const { data: executionsData, error: execError } = await supabase
      .from('follow_up_step_executions')
      .select('lead_id, flow_id, step_id, step_order, executed_at');

    if (execError) throw execError;

    // Mapear execuções por lead+flow
    const executionMap = new Map<string, StepExecution[]>();
    (executionsData || []).forEach(exec => {
      const key = `${exec.lead_id}-${exec.flow_id}`;
      if (!executionMap.has(key)) {
        executionMap.set(key, []);
      }
      executionMap.get(key)!.push(exec);
    });

    // 5. Buscar perfis de vendedores para substituição de template
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    const profilesMap = new Map<string, string>();
    (profilesData || []).forEach(p => {
      profilesMap.set(p.id, p.full_name || '');
    });

    // 6. Processar cada fluxo
    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const flow of flows) {
      if (flow.steps.length === 0) {
        console.log(`Flow "${flow.name}" has no steps, skipping`);
        continue;
      }

      console.log(`\nProcessing flow: ${flow.name} (${flow.steps.length} steps)`);

      // Filtrar leads elegíveis para este fluxo
      const eligibleLeads = (leadsData || []).filter(lead => {
        // Excluir convertidos se configurado
        if (flow.exclude_converted_leads && lead.status === 'converted') return false;
        
        // Excluir perdidos se configurado
        if (flow.exclude_lost_leads && lead.status === 'lost') return false;
        
        // Filtrar por status se definido
        if (flow.target_lead_status?.length > 0 && !flow.target_lead_status.includes(lead.status)) {
          return false;
        }
        
        // Filtrar por source se definido
        if (flow.target_lead_sources?.length > 0 && !flow.target_lead_sources.includes(lead.source)) {
          return false;
        }
        
        return true;
      });

      console.log(`${eligibleLeads.length} leads eligible for flow "${flow.name}"`);

      for (const lead of eligibleLeads) {
        totalProcessed++;
        const leadFlowKey = `${lead.id}-${flow.id}`;
        const executions = executionMap.get(leadFlowKey) || [];
        
        // Verificar qual é o próximo passo
        const executedStepOrders = executions.map(e => e.step_order);
        const lastExecutedOrder = Math.max(0, ...executedStepOrders);
        const lastExecution = executions.find(e => e.step_order === lastExecutedOrder);
        
        // Encontrar próximo passo
        const nextStep = flow.steps.find(s => s.step_order > lastExecutedOrder);
        
        if (!nextStep) {
          // Todos os passos já foram executados
          continue;
        }

        // Calcular se já passou tempo suficiente desde último passo (ou criação do lead)
        const referenceTime = lastExecution 
          ? new Date(lastExecution.executed_at) 
          : new Date(lead.created_at);
        
        const minutesSinceReference = (Date.now() - referenceTime.getTime()) / (1000 * 60);
        
        if (minutesSinceReference < nextStep.delay_minutes) {
          // Ainda não é hora de executar este passo
          continue;
        }

        console.log(`Lead ${lead.name}: ready for step ${nextStep.step_order} (${nextStep.delay_minutes}min delay)`);

        // Verificar condições de parada
        let shouldSkip = false;
        let skipReason = '';

        // Verificar se lead foi qualificado
        if (nextStep.stop_if_qualified) {
          const { data: qualData } = await supabase
            .from('lead_qualification_data')
            .select('is_qualified')
            .eq('lead_id', lead.id)
            .single();
          
          if (qualData?.is_qualified) {
            shouldSkip = true;
            skipReason = 'Lead já qualificado';
          }
        }

        // Verificar se foi atribuído a vendedor
        if (!shouldSkip && nextStep.stop_if_assigned_to_salesperson && lead.assigned_to) {
          shouldSkip = true;
          skipReason = 'Lead atribuído a vendedor';
        }

        // Verificar se lead respondeu desde última execução
        if (!shouldSkip && nextStep.stop_if_responded && lastExecution) {
          const { data: hasResponded } = await supabase
            .rpc('lead_has_responded_since', {
              p_lead_id: lead.id,
              p_since: lastExecution.executed_at
            });
          
          if (hasResponded) {
            shouldSkip = true;
            skipReason = 'Lead respondeu';
          }
        }

        if (shouldSkip) {
          console.log(`  ⏭️ Skipping: ${skipReason}`);
          totalSkipped++;
          
          // Registrar skip
          await supabase
            .from('follow_up_step_executions')
            .insert({
              lead_id: lead.id,
              flow_id: flow.id,
              step_id: nextStep.id,
              step_order: nextStep.step_order,
              status: 'skipped',
              error_message: skipReason
            });
          
          continue;
        }

        // Processar template da mensagem
        const salespersonName = lead.assigned_to ? profilesMap.get(lead.assigned_to) : undefined;
        const message = processTemplate(nextStep.message_template, lead, salespersonName);

        // Enviar via WhatsApp
        try {
          const evolutionUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
          const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') ?? '';

          // Buscar instância (do fluxo ou default)
          let instanceName = '';
          
          if (flow.whatsapp_instance_id) {
            const { data: instance } = await supabase
              .from('whatsapp_instances')
              .select('instance_name, status')
              .eq('id', flow.whatsapp_instance_id)
              .single();
            
            if (instance?.status === 'connected') {
              instanceName = instance.instance_name;
            }
          }
          
          // Fallback para primeira instância conectada
          if (!instanceName) {
            const { data: defaultInstance } = await supabase
              .from('whatsapp_instances')
              .select('instance_name')
              .eq('status', 'connected')
              .limit(1)
              .single();
            
            if (defaultInstance) {
              instanceName = defaultInstance.instance_name;
            }
          }

          if (!instanceName) {
            throw new Error('Nenhuma instância WhatsApp conectada');
          }

          // Formatar telefone
          let phone = lead.phone.replace(/\D/g, '');
          if (!phone.startsWith('55')) {
            phone = '55' + phone;
          }

          // Enviar mensagem
          const sendUrl = `${evolutionUrl}/message/sendText/${instanceName}`;
          console.log(`  📤 Sending to ${phone}: "${message.substring(0, 50)}..."`);

          const response = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Erro ao enviar WhatsApp');
          }

          console.log(`  ✅ Sent successfully!`);
          totalSent++;

          // Registrar execução
          await supabase
            .from('follow_up_step_executions')
            .insert({
              lead_id: lead.id,
              flow_id: flow.id,
              step_id: nextStep.id,
              step_order: nextStep.step_order,
              message_sent: message,
              whatsapp_instance_id: flow.whatsapp_instance_id,
              status: 'sent'
            });

          // Salvar mensagem no histórico
          const { data: contact } = await supabase
            .from('whatsapp_contacts')
            .select('id')
            .eq('lead_id', lead.id)
            .maybeSingle();

          if (contact) {
            await supabase
              .from('whatsapp_messages')
              .insert({
                contact_id: contact.id,
                remote_jid: `${phone}@s.whatsapp.net`,
                message_id: result.key?.id,
                direction: 'outgoing',
                message_type: 'text',
                content: message,
                status: 'sent',
                lead_id: lead.id,
              });
          }

          // Registrar interação no lead
          await supabase
            .from('lead_interactions')
            .insert({
              lead_id: lead.id,
              type: 'follow_up',
              description: `Follow-up automático (${flow.name} - Passo ${nextStep.step_order}): ${message.substring(0, 100)}...`
            });

        } catch (sendError) {
          const errorMsg = sendError instanceof Error ? sendError.message : 'Erro desconhecido';
          console.error(`  ❌ Send error: ${errorMsg}`);
          errors.push(`Lead ${lead.name}: ${errorMsg}`);

          // Registrar falha
          await supabase
            .from('follow_up_step_executions')
            .insert({
              lead_id: lead.id,
              flow_id: flow.id,
              step_id: nextStep.id,
              step_order: nextStep.step_order,
              status: 'failed',
              error_message: errorMsg
            });
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Processing complete in ${duration}ms`);
    console.log(`   Processed: ${totalProcessed}, Sent: ${totalSent}, Skipped: ${totalSkipped}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        sent: totalSent,
        skipped: totalSkipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 10),
        durationMs: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Follow-up processing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
