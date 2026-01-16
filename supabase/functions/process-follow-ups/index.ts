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

interface AIConversation {
  id: string;
  lead_id: string;
  status: string;
  last_assistant_message_at: string | null;
  last_user_message_at: string | null;
}

// Substitui variáveis no template - suporta {{var}} e {var}
function processTemplate(template: string, lead: Lead, salespersonName?: string): string {
  let message = template;
  
  const firstName = lead.name.split(' ')[0];
  
  // Suporte para {{var}} (duplo) e {var} (simples)
  message = message.replace(/\{\{nome\}\}/gi, firstName);
  message = message.replace(/\{nome\}/gi, firstName);
  
  message = message.replace(/\{\{nome_completo\}\}/gi, lead.name);
  message = message.replace(/\{nome_completo\}/gi, lead.name);
  
  message = message.replace(/\{\{veiculo\}\}/gi, lead.vehicle_interest || 'veículo de interesse');
  message = message.replace(/\{veiculo\}/gi, lead.vehicle_interest || 'veículo de interesse');
  
  if (salespersonName) {
    message = message.replace(/\{\{vendedor\}\}/gi, salespersonName);
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

    // Verificar body para execução manual forçada
    let forceExecution = false;
    try {
      const body = await req.json();
      forceExecution = body?.force === true;
    } catch {
      // Body vazio é ok
    }

    // Verificar se automação está ativa (a menos que seja execução forçada)
    if (!forceExecution) {
      const { data: settings } = await supabase
        .from('follow_up_settings')
        .select('automation_enabled')
        .single();

      if (!settings?.automation_enabled) {
        console.log('⏸️ Automation is disabled, skipping cron execution');
        return new Response(
          JSON.stringify({ success: true, message: 'Automation disabled', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('🔧 Force execution requested (manual trigger)');
    }

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

    // 3. Buscar conversas ativas com a IA para trigger "no_response_to_bot"
    // Isso inclui a última mensagem de cada conversa para verificar se foi da IA
    const { data: conversations, error: convError } = await supabase
      .from('ai_agent_conversations')
      .select('id, lead_id, status, updated_at')
      .eq('status', 'active');

    if (convError) throw convError;

    console.log(`Found ${conversations?.length || 0} active AI conversations`);

    // Para cada conversa, buscar a última mensagem
    const conversationDetails: AIConversation[] = [];
    
    for (const conv of (conversations || [])) {
      // Buscar última mensagem da conversa
      const { data: lastMessages } = await supabase
        .from('ai_agent_messages')
        .select('role, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (lastMessages && lastMessages.length > 0) {
        const lastMessage = lastMessages[0];
        const lastAssistant = lastMessages.find(m => m.role === 'assistant');
        const lastUser = lastMessages.find(m => m.role === 'user');
        
        conversationDetails.push({
          id: conv.id,
          lead_id: conv.lead_id,
          status: conv.status,
          last_assistant_message_at: lastAssistant?.created_at || null,
          last_user_message_at: lastUser?.created_at || null
        });

        console.log(`Conv ${conv.lead_id}: last msg by ${lastMessage.role} at ${lastMessage.created_at}`);
      }
    }

    // Filtrar apenas conversas onde a última mensagem foi da IA (assistant)
    // E que a última mensagem da IA foi nas últimas 2 horas (janela máxima para follow-up)
    const MAX_FOLLOW_UP_WINDOW_MINUTES = 120; // 2 horas
    
    const leadsWaitingResponse = conversationDetails.filter(conv => {
      if (!conv.last_assistant_message_at) return false;
      
      // Verificar se a última mensagem da IA está dentro da janela de tempo
      const minutesSinceLastBotMessage = (Date.now() - new Date(conv.last_assistant_message_at).getTime()) / (1000 * 60);
      if (minutesSinceLastBotMessage > MAX_FOLLOW_UP_WINDOW_MINUTES) {
        return false; // Muito antigo, não processar
      }
      
      // Se não tem mensagem do usuário, ou se a última do assistant é depois da última do user
      if (!conv.last_user_message_at) return true;
      
      return new Date(conv.last_assistant_message_at) > new Date(conv.last_user_message_at);
    });

    console.log(`${leadsWaitingResponse.length} leads waiting for response within ${MAX_FOLLOW_UP_WINDOW_MINUTES}min window`);

    // 4. Buscar dados dos leads elegíveis
    const eligibleLeadIds = leadsWaitingResponse.map(c => c.lead_id);
    
    if (eligibleLeadIds.length === 0) {
      console.log('No leads waiting for response');
      return new Response(
        JSON.stringify({ success: true, message: 'No leads waiting for response', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', eligibleLeadIds)
      .not('status', 'eq', 'convertido');

    if (leadsError) throw leadsError;
    
    console.log(`Found ${leadsData?.length || 0} eligible leads`);

    // Criar mapa de conversa por lead
    const convByLead = new Map<string, AIConversation>();
    leadsWaitingResponse.forEach(c => convByLead.set(c.lead_id, c));

    // 5. Buscar execuções existentes para não repetir
    const { data: executionsData, error: execError } = await supabase
      .from('follow_up_step_executions')
      .select('lead_id, flow_id, step_id, step_order, executed_at')
      .in('lead_id', eligibleLeadIds);

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

    // 6. Buscar perfis de vendedores para substituição de template
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    const profilesMap = new Map<string, string>();
    (profilesData || []).forEach(p => {
      profilesMap.set(p.id, p.full_name || '');
    });

    // 7. Processar cada fluxo
    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const flow of flows) {
      // Só processar fluxos com trigger "no_response_to_bot"
      if (flow.trigger_type !== 'no_response_to_bot') {
        console.log(`Flow "${flow.name}" has trigger "${flow.trigger_type}", skipping (only no_response_to_bot supported)`);
        continue;
      }

      if (flow.steps.length === 0) {
        console.log(`Flow "${flow.name}" has no steps, skipping`);
        continue;
      }

      console.log(`\nProcessing flow: ${flow.name} (${flow.steps.length} steps)`);

      // Filtrar leads elegíveis para este fluxo
      const eligibleLeads = (leadsData || []).filter(lead => {
        // Excluir convertidos se configurado
        if (flow.exclude_converted_leads && lead.status === 'convertido') return false;
        
        // Excluir perdidos se configurado
        if (flow.exclude_lost_leads && lead.status === 'perdido') return false;
        
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
        const conversation = convByLead.get(lead.id);
        
        if (!conversation) {
          console.log(`  Lead ${lead.name}: no conversation found, skipping`);
          continue;
        }

        // Verificar qual é o próximo passo
        const executedStepOrders = executions.map(e => e.step_order);
        const lastExecutedOrder = Math.max(0, ...executedStepOrders);
        const lastExecution = executions.find(e => e.step_order === lastExecutedOrder);
        
        // Encontrar próximo passo
        const nextStep = flow.steps.find(s => s.step_order > lastExecutedOrder);
        
        if (!nextStep) {
          // Todos os passos já foram executados
          console.log(`  Lead ${lead.name}: all steps already executed`);
          continue;
        }

        // Calcular tempo desde a última mensagem da IA (não desde criação do lead!)
        const lastBotMessageTime = conversation.last_assistant_message_at 
          ? new Date(conversation.last_assistant_message_at) 
          : null;

        if (!lastBotMessageTime) {
          console.log(`  Lead ${lead.name}: no bot message found, skipping`);
          continue;
        }

        const minutesSinceLastBotMessage = (Date.now() - lastBotMessageTime.getTime()) / (1000 * 60);
        
        console.log(`  Lead ${lead.name}: ${minutesSinceLastBotMessage.toFixed(1)}min since last bot message, step needs ${nextStep.delay_minutes}min`);

        if (minutesSinceLastBotMessage < nextStep.delay_minutes) {
          // Ainda não é hora de executar este passo
          console.log(`    -> Not time yet, skipping`);
          continue;
        }

        console.log(`  Lead ${lead.name}: ready for step ${nextStep.step_order}`);

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

        // Verificar se foi transferido para vendedor (qualification_status = 'qualificado')
        // Nota: assigned_to sempre existe desde a criação (Round-Robin), então verificamos qualification_status
        if (!shouldSkip && nextStep.stop_if_assigned_to_salesperson && lead.qualification_status === 'qualificado') {
          shouldSkip = true;
          skipReason = 'Lead já transferido para vendedor (qualificado)';
        }

        // Verificar se lead respondeu desde última execução deste fluxo
        if (!shouldSkip && nextStep.stop_if_responded && lastExecution) {
          const lastExecTime = new Date(lastExecution.executed_at);
          const lastUserTime = conversation.last_user_message_at 
            ? new Date(conversation.last_user_message_at) 
            : null;

          if (lastUserTime && lastUserTime > lastExecTime) {
            shouldSkip = true;
            skipReason = 'Lead respondeu após último follow-up';
          }
        }

        if (shouldSkip) {
          console.log(`    ⏭️ Skipping: ${skipReason}`);
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
          console.log(`    📤 Sending to ${phone}: "${message.substring(0, 50)}..."`);

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

          console.log(`    ✅ Sent successfully!`);
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

          // Salvar mensagem no histórico de WhatsApp
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
          console.error(`    ❌ Send error: ${errorMsg}`);
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

    // Atualizar última execução
    await supabase
      .from('follow_up_settings')
      .update({ last_execution_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

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
