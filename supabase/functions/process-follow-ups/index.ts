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
  target_negotiation_status: string[];
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
  qualification_status: string | null;
}

interface Negotiation {
  id: string;
  lead_id: string;
  status: string;
  last_message_at: string | null;
  lead: Lead;
}

interface FollowUpTracking {
  id: string;
  lead_id: string;
  negotiation_id: string | null;
  flow_id: string;
  current_step: number;
  status: string;
  next_step_at: string | null;
  last_step_at: string | null;
  started_at: string | null;
  reactivated_count: number;
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

    // 1. Primeiro, mover negociações stale para follow_up (>24h sem resposta em negociando/atendimento_ia)
    console.log('🔄 Moving stale negotiations to follow_up...');
    const { error: staleError } = await supabase.rpc('move_stale_negotiations_to_follow_up');
    if (staleError) {
      console.error('Error moving stale negotiations:', staleError.message);
    }

    // 2. Buscar TODOS os fluxos ativos (independente do trigger_type)
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

    // 3. Coletar todos os status de negociação que os fluxos ativos miram
    const targetStatuses = new Set<string>();
    
    for (const flow of flowsData) {
      if (flow.target_negotiation_status && flow.target_negotiation_status.length > 0) {
        flow.target_negotiation_status.forEach((s: string) => targetStatuses.add(s));
      } else {
        // Se o fluxo não tem target_negotiation_status, assume follow_up
        targetStatuses.add('follow_up');
      }
    }

    const statusArray = Array.from(targetStatuses);
    console.log(`Querying negotiations with statuses: ${statusArray.join(', ')}`);

    // 4. Buscar negociações nos status que os fluxos miram (inativas há >1h, limite 50 por batch)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: negotiationsData, error: negError } = await supabase
      .from('negotiations')
      .select(`
        id,
        lead_id,
        status,
        last_message_at,
        lead:leads!inner(
          id, name, phone, status, source, assigned_to, created_at, vehicle_interest, qualification_status
        )
      `)
      .in('status', statusArray)
      .lt('last_message_at', oneHourAgo)
      .not('lead.status', 'eq', 'convertido')
      .order('last_message_at', { ascending: true })
      .limit(50);

    if (negError) throw negError;

    const negotiations: Negotiation[] = (negotiationsData || []).map((n: any) => ({
      id: n.id,
      lead_id: n.lead_id,
      status: n.status,
      last_message_at: n.last_message_at,
      lead: n.lead,
    }));

    console.log(`Found ${negotiations.length} negotiations to process (batch of 50, inactive >1h)`);

    if (negotiations.length === 0) {
      console.log('No inactive negotiations to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No inactive negotiations', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Buscar steps de cada fluxo
    const flowIds = flowsData.map(f => f.id);
    const { data: stepsData, error: stepsError } = await supabase
      .from('follow_up_steps')
      .select('*')
      .in('flow_id', flowIds)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    // Agrupar steps por fluxo
    const flows: FollowUpFlow[] = flowsData.map(flow => ({
      ...flow,
      steps: (stepsData || []).filter(s => s.flow_id === flow.id),
    }));

    // 5. Buscar tracking existente para as negociações
    const negotiationIds = negotiations.map(n => n.id);
    const { data: trackingData, error: trackingError } = await supabase
      .from('lead_follow_up_tracking')
      .select('*')
      .in('negotiation_id', negotiationIds)
      .eq('status', 'active');

    if (trackingError) throw trackingError;

    const trackingMap = new Map<string, FollowUpTracking>();
    (trackingData || []).forEach(t => {
      trackingMap.set(t.negotiation_id!, t);
    });

    // 6. Buscar perfis de vendedores para substituição de template
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    const profilesMap = new Map<string, string>();
    (profilesData || []).forEach(p => {
      profilesMap.set(p.id, p.full_name || '');
    });

    // 7. Processar cada negociação
    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const negotiation of negotiations) {
      const lead = negotiation.lead;
      totalProcessed++;

      console.log(`\n📋 Processing: ${lead.name} (${negotiation.status}, negotiation ${negotiation.id})`);

      // Verificar se lead está convertido
      if (lead.status === 'convertido') {
        console.log('  ⏭️ Lead converted, skipping');
        totalSkipped++;
        continue;
      }

      // Verificar inatividade mínima - não enviar follow-up se teve mensagem recente (<1h)
      if (negotiation.last_message_at) {
        const minutesSinceLastMsg = (Date.now() - new Date(negotiation.last_message_at).getTime()) / (1000 * 60);
        if (minutesSinceLastMsg < 60) {
          console.log(`  ⏭️ Recent activity (${minutesSinceLastMsg.toFixed(0)}min ago), skipping`);
          totalSkipped++;
          continue;
        }
      }

      // Encontrar fluxo aplicável
      const applicableFlow = flows.find(flow => {
        // Verificar filtros do fluxo
        if (flow.exclude_converted_leads && lead.status === 'convertido') return false;
        if (flow.exclude_lost_leads && lead.status === 'perdido') return false;
        
        if (flow.target_lead_status?.length > 0 && !flow.target_lead_status.includes(lead.status)) {
          return false;
        }
        
        if (flow.target_lead_sources?.length > 0 && !flow.target_lead_sources.includes(lead.source)) {
          return false;
        }

        if (flow.target_negotiation_status?.length > 0 && !flow.target_negotiation_status.includes(negotiation.status)) {
          return false;
        }
        
        return flow.steps.length > 0;
      });

      if (!applicableFlow) {
        console.log('  ⏭️ No applicable flow');
        totalSkipped++;
        continue;
      }

      console.log(`  🔄 Using flow: ${applicableFlow.name}`);

      // Buscar ou criar tracking
      let tracking: FollowUpTracking | null = trackingMap.get(negotiation.id) || null;
      
      if (!tracking) {
        // Criar novo tracking - usar last_message_at como referência de início
        // para que o delay conte desde a última atividade do lead
        const trackingStartedAt = negotiation.last_message_at || new Date().toISOString();
        const { data: newTracking, error: createError } = await supabase
          .from('lead_follow_up_tracking')
          .insert({
            lead_id: lead.id,
            negotiation_id: negotiation.id,
            flow_id: applicableFlow.id,
            current_step: 0,
            status: 'active',
            started_at: trackingStartedAt,
          })
          .select()
          .single();

        if (createError || !newTracking) {
          console.error('  ❌ Error creating tracking:', createError?.message);
          errors.push(`${lead.name}: Error creating tracking`);
          continue;
        }

        tracking = newTracking as FollowUpTracking;
        console.log(`  📝 Created new tracking (started_at: ${trackingStartedAt})`);
      }

      // Encontrar próximo step
      const currentStepOrder = tracking!.current_step || 0;
      const nextStep = applicableFlow.steps.find(s => s.step_order === currentStepOrder + 1);

      if (!nextStep) {
        console.log('  ✅ All steps completed');
        
        // Marcar tracking como completo
        await supabase
          .from('lead_follow_up_tracking')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', tracking!.id);
        
        continue;
      }

      // Calcular tempo desde último step/início
      const referenceTime = tracking!.last_step_at 
        ? new Date(tracking!.last_step_at)
        : new Date(tracking!.started_at || negotiation.last_message_at || new Date());
      
      const minutesSinceReference = (Date.now() - referenceTime.getTime()) / (1000 * 60);

      console.log(`  ⏱️ Minutes since reference: ${minutesSinceReference.toFixed(1)}, step needs: ${nextStep.delay_minutes}`);

      if (minutesSinceReference < nextStep.delay_minutes) {
        console.log('  ⏳ Not time yet');
        
        // Atualizar next_step_at se não estiver definido
        if (!tracking!.next_step_at) {
          const nextStepTime = new Date(referenceTime.getTime() + nextStep.delay_minutes * 60 * 1000);
          await supabase
            .from('lead_follow_up_tracking')
            .update({ next_step_at: nextStepTime.toISOString() })
            .eq('id', tracking!.id);
        }
        
        continue;
      }

      // Verificar condições de parada
      let shouldSkip = false;
      let skipReason = '';

      // Verificar se foi qualificado
      if (nextStep.stop_if_qualified && lead.qualification_status === 'qualificado') {
        shouldSkip = true;
        skipReason = 'Lead já qualificado';
      }

      // Verificar se transferido para vendedor
      if (!shouldSkip && nextStep.stop_if_assigned_to_salesperson && lead.qualification_status === 'qualificado') {
        shouldSkip = true;
        skipReason = 'Lead já transferido para vendedor';
      }

      // Verificar se respondeu recentemente (negociação saiu de follow_up e voltou)
      if (!shouldSkip && nextStep.stop_if_responded && tracking!.reactivated_count && tracking!.reactivated_count > 0) {
        shouldSkip = true;
        skipReason = 'Lead respondeu recentemente';
      }

      if (shouldSkip) {
        console.log(`  ⏭️ Skipping: ${skipReason}`);
        totalSkipped++;

        // Registrar skip
        await supabase
          .from('follow_up_step_executions')
          .insert({
            lead_id: lead.id,
            flow_id: applicableFlow.id,
            step_id: nextStep.id,
            step_order: nextStep.step_order,
            status: 'skipped',
            error_message: skipReason,
          });

        continue;
      }

      // Processar template
      const salespersonName = lead.assigned_to ? profilesMap.get(lead.assigned_to) : undefined;
      const message = processTemplate(nextStep.message_template, lead, salespersonName);

      // Enviar via WhatsApp
      try {
        const evolutionUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') ?? '';

        // Buscar instância
        let instanceName = '';

        if (applicableFlow.whatsapp_instance_id) {
          const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('instance_name, status')
            .eq('id', applicableFlow.whatsapp_instance_id)
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

        console.log('  ✅ Sent successfully!');
        totalSent++;

        // Calcular próximo step
        const nextNextStep = applicableFlow.steps.find(s => s.step_order === nextStep.step_order + 1);
        const nextStepAt = nextNextStep 
          ? new Date(Date.now() + nextNextStep.delay_minutes * 60 * 1000).toISOString()
          : null;

        // Atualizar tracking
        await supabase
          .from('lead_follow_up_tracking')
          .update({
            current_step: nextStep.step_order,
            last_step_at: new Date().toISOString(),
            next_step_at: nextStepAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tracking!.id);

        // Registrar execução
        await supabase
          .from('follow_up_step_executions')
          .insert({
            lead_id: lead.id,
            flow_id: applicableFlow.id,
            step_id: nextStep.id,
            step_order: nextStep.step_order,
            message_sent: message,
            whatsapp_instance_id: applicableFlow.whatsapp_instance_id,
            status: 'sent',
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
            description: `Follow-up automático (${applicableFlow.name} - Passo ${nextStep.step_order}): ${message.substring(0, 100)}...`,
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
            flow_id: applicableFlow.id,
            step_id: nextStep.id,
            step_order: nextStep.step_order,
            status: 'failed',
            error_message: errorMsg,
          });
      }
    }

    // Atualizar última execução
    await supabase
      .from('follow_up_settings')
      .update({ last_execution_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

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
        durationMs: duration,
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
