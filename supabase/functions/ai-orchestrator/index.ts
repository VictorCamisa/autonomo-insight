import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestratorAction {
  type: 'move_stage' | 'create_alert' | 'assign_salesperson';
  payload: Record<string, unknown>;
}

interface RAGContext {
  content: string;
  role: string;
  similarity: number;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      action, 
      lead_id, 
      negotiation_id, 
      message_content,
      qualification_level 
    } = await req.json();

    console.log('[ai-orchestrator] Received action:', action, { lead_id, negotiation_id });

    let result: { success: boolean; actions_taken: OrchestratorAction[]; rag_context?: RAGContext[] } = { 
      success: true, 
      actions_taken: [] 
    };

    switch (action) {
      case 'get_rag_context': {
        // Buscar contexto RAG para uma mensagem
        if (!message_content) {
          throw new Error('message_content is required for get_rag_context');
        }

        // Gerar embedding da mensagem
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: message_content.substring(0, 8000),
            model: 'text-embedding-ada-002',
          }),
        });

        if (!embeddingResponse.ok) {
          throw new Error('Failed to generate embedding');
        }

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // Buscar conversas similares usando a função do banco
        const { data: similarConversations, error: searchError } = await supabase.rpc(
          'search_similar_conversations',
          {
            query_embedding: `[${queryEmbedding.join(',')}]`,
            p_lead_id: lead_id || null,
            match_threshold: 0.6,
            match_count: 5,
          }
        );

        if (searchError) {
          console.error('[ai-orchestrator] RAG search error:', searchError);
        }

        const ragContext = similarConversations || [];
        result.rag_context = ragContext;
        console.log(`[ai-orchestrator] Found ${ragContext.length} similar conversations`);
        break;
      }

      case 'check_qualification': {
        // Verificar nível de qualificação e decidir ações
        if (!negotiation_id) {
          throw new Error('negotiation_id is required for check_qualification');
        }

        const { data: negotiation } = await supabase
          .from('negotiations')
          .select(`
            id,
            lead_id,
            status,
            salesperson_id,
            lead:leads(
              id,
              name,
              phone,
              qualification_level,
              vehicle_interest,
              assigned_to
            )
          `)
          .eq('id', negotiation_id)
          .single();

        if (!negotiation) {
          throw new Error('Negotiation not found');
        }

        const lead = negotiation.lead as { 
          qualification_level?: string; 
          assigned_to?: string;
          vehicle_interest?: string;
          name?: string;
        } | null;
        const qualLevel = qualification_level || lead?.qualification_level;

        console.log('[ai-orchestrator] Checking qualification:', qualLevel);

        // Q1 - Atribuir vendedor via Round Robin
        if (qualLevel === 'q1' && !lead?.assigned_to) {
          const { data: nextSalesperson } = await supabase.rpc('get_next_round_robin_salesperson');
          
          if (nextSalesperson) {
            // Atribuir ao lead
            await supabase
              .from('leads')
              .update({ assigned_to: nextSalesperson })
              .eq('id', negotiation.lead_id);

            // Atualizar negociação
            await supabase
              .from('negotiations')
              .update({ salesperson_id: nextSalesperson })
              .eq('id', negotiation_id);

            // Incrementar contador
            await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: nextSalesperson });

            result.actions_taken.push({
              type: 'assign_salesperson',
              payload: { salesperson_id: nextSalesperson }
            });

            console.log('[ai-orchestrator] Assigned salesperson:', nextSalesperson);
          }
        }

        // Q2 - Mover para "Negociando" e enviar ficha ao vendedor via WhatsApp
        if (qualLevel === 'q2' || qualLevel === 'q3') {
          if (negotiation.status === 'atendimento_ia') {
            await supabase
              .from('negotiations')
              .update({ status: 'negociando' })
              .eq('id', negotiation_id);

            result.actions_taken.push({
              type: 'move_stage',
              payload: { from: 'atendimento_ia', to: 'negociando' }
            });

            // Criar alerta para vendedor e enviar ficha via WhatsApp
            if (negotiation.salesperson_id) {
              // Notificação in-app
              await supabase.from('notifications').insert({
                user_id: negotiation.salesperson_id,
                type: 'lead_qualified',
                title: 'Lead qualificado!',
                message: `${lead?.name || 'Lead'} foi qualificado e está pronto para negociação.`,
                link: `/crm`,
              });

              result.actions_taken.push({
                type: 'create_alert',
                payload: { 
                  type: 'lead_qualified', 
                  user_id: negotiation.salesperson_id 
                }
              });

              // === ENVIAR FICHA VIA WHATSAPP AO VENDEDOR ===
              try {
                // Buscar perfil do vendedor (telefone)
                const { data: salespersonProfile } = await supabase
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('id', negotiation.salesperson_id)
                  .single();

                // Buscar conversas do lead para gerar ficha
                const { data: conversations } = await supabase
                  .from('ai_agent_conversations')
                  .select('id')
                  .eq('lead_id', negotiation.lead_id)
                  .order('created_at', { ascending: false })
                  .limit(1);

                let conversationSummary = '';
                if (conversations && conversations.length > 0) {
                  const { data: messages } = await supabase
                    .from('ai_agent_messages')
                    .select('content, role, created_at')
                    .eq('conversation_id', conversations[0].id)
                    .order('created_at', { ascending: true })
                    .limit(30);

                  if (messages && messages.length > 0) {
                    // Gerar ficha com GPT-4o-mini
                    const fichaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                          {
                            role: 'system',
                            content: `Você é um assistente que gera fichas de qualificação de leads para vendedores de veículos.
Gere uma ficha CONCISA e OBJETIVA em formato WhatsApp (com emojis e formatação *negrito*).

A ficha deve conter:
- Nome do lead e telefone
- Resumo da conversa (máx 3 linhas)
- Veículo de interesse (se mencionado)
- Perfil financeiro coletado (se mencionado)
- Dores e urgência identificadas
- Sugestões de abordagem para o vendedor
- Link direto para WhatsApp do lead

OMITA seções onde não há informação. Seja direto e prático.
Formato: mensagem de WhatsApp amigável, NÃO use markdown de tabela.`
                          },
                          {
                            role: 'user',
                            content: `Gere a ficha para este lead:
Nome: ${lead?.name || 'N/A'}
Telefone: ${(lead as any)?.phone || 'N/A'}
Interesse: ${lead?.vehicle_interest || 'N/A'}

Conversa:
${messages.map((m: any) => `${m.role === 'user' ? 'Cliente' : 'IA'}: ${m.content}`).join('\n').substring(0, 3000)}`
                          }
                        ],
                        temperature: 0.4,
                        max_tokens: 800,
                      }),
                    });

                    if (fichaResponse.ok) {
                      const fichaData = await fichaResponse.json();
                      conversationSummary = fichaData.choices?.[0]?.message?.content || '';
                    }
                  }
                }

                // Enviar via WhatsApp se vendedor tem telefone
                if (salespersonProfile?.phone && conversationSummary) {
                  // Buscar instância WhatsApp ativa
                  const { data: instance } = await supabase
                    .from('whatsapp_instances')
                    .select('id')
                    .eq('status', 'connected')
                    .limit(1)
                    .single();

                  if (instance) {
                    // Formatar número do vendedor
                    let sellerPhone = salespersonProfile.phone.replace(/\D/g, '');
                    if (sellerPhone.length <= 11) sellerPhone = '55' + sellerPhone;

                    const fichaMessage = `🔔 *NOVO LEAD QUALIFICADO*\n\n${conversationSummary}`;

                    // Enviar via edge function whatsapp-send
                    await supabase.functions.invoke('whatsapp-send', {
                      body: {
                        instance_id: instance.id,
                        to: sellerPhone,
                        message: fichaMessage,
                      },
                    });

                    console.log('[ai-orchestrator] Ficha sent to salesperson via WhatsApp:', sellerPhone);
                    
                    result.actions_taken.push({
                      type: 'create_alert',
                      payload: { 
                        type: 'whatsapp_ficha_sent', 
                        user_id: negotiation.salesperson_id,
                        phone: sellerPhone,
                      }
                    });
                  } else {
                    console.log('[ai-orchestrator] No connected WhatsApp instance found, skipping ficha send');
                  }
                } else {
                  console.log('[ai-orchestrator] Salesperson has no phone or no ficha generated, skipping WhatsApp send');
                }
              } catch (whatsappError) {
                console.error('[ai-orchestrator] Error sending ficha via WhatsApp:', whatsappError);
                // Não falha a operação principal se o WhatsApp falhar
              }
            }
          }
        }
        break;
      }

      case 'check_stale_negotiations': {
        // Verificar negociações paradas há mais de 24h
        const { data: staleNegotiations } = await supabase
          .from('negotiations')
          .select('id, lead_id, salesperson_id')
          .eq('status', 'negociando')
          .lt('last_message_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (staleNegotiations && staleNegotiations.length > 0) {
          console.log(`[ai-orchestrator] Found ${staleNegotiations.length} stale negotiations`);

          for (const neg of staleNegotiations) {
            // Mover para follow_up
            await supabase
              .from('negotiations')
              .update({ status: 'follow_up' })
              .eq('id', neg.id);

            result.actions_taken.push({
              type: 'move_stage',
              payload: { negotiation_id: neg.id, from: 'negociando', to: 'follow_up' }
            });

            // Iniciar tracking de follow-up
            const { data: defaultFlow } = await supabase
              .from('follow_up_flows')
              .select('id')
              .eq('is_active', true)
              .eq('trigger_type', 'no_response')
              .limit(1)
              .single();

            if (defaultFlow) {
              await supabase.from('lead_follow_up_tracking').insert({
                lead_id: neg.lead_id,
                negotiation_id: neg.id,
                flow_id: defaultFlow.id,
                current_step: 0,
                status: 'active',
              });

              result.actions_taken.push({
                type: 'trigger_follow_up',
                payload: { negotiation_id: neg.id, flow_id: defaultFlow.id }
              });
            }
          }
        }
        break;
      }

      case 'analyze_conversation': {
        // Analisar conversa e sugerir próximas ações
        if (!lead_id) {
          throw new Error('lead_id is required for analyze_conversation');
        }

        // Buscar conversas do lead
        const { data: conversations } = await supabase
          .from('ai_agent_conversations')
          .select('id')
          .eq('lead_id', lead_id);

        const conversationIds = conversations?.map((c: { id: string }) => c.id) || [];

        // Buscar mensagens dessas conversas
        const { data: messages } = await supabase
          .from('ai_agent_messages')
          .select('content, role, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true });

        const leadMessages = messages || [];

        // Usar GPT para analisar a conversa
        const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Você é um analista de vendas. Analise a conversa e retorne um JSON com:
                  - sentiment: "positive" | "neutral" | "negative"
                  - intent: string (intenção principal do cliente)
                  - objections: string[] (objeções identificadas)
                  - suggested_actions: string[] (próximas ações sugeridas)
                  - qualification_score: number (0-100)
                  - summary: string (resumo em 1 frase)`
              },
              {
                role: 'user',
                content: `Analise esta conversa:\n\n${leadMessages.map((m: { role: string; content: string }) => 
                  `${m.role}: ${m.content}`
                ).join('\n')}`
              }
            ],
            response_format: { type: 'json_object' }
          }),
        });

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          result = {
            ...result,
            ...JSON.parse(analysis.choices[0].message.content)
          };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
