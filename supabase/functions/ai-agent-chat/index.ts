import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[ai-agent-chat] Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, agent_id, conversation_history = [], data_sources = [] } = body;
    
    console.log('[ai-agent-chat] Processing message for agent:', agent_id);

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agent config
    let agentConfig = null;
    if (agent_id) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agent_id)
        .single();
      agentConfig = agent;
    }

    // Get active data sources from agent config (stored in vector_db_config)
    let activeDataSources: string[] = data_sources;
    if (agentConfig && activeDataSources.length === 0) {
      const vectorConfig = agentConfig.vector_db_config as Record<string, unknown> || {};
      const configSources = (vectorConfig.enabled_data_sources as string[]) || [];
      activeDataSources = configSources;
    }

    // Default to all sources if none specified
    if (activeDataSources.length === 0) {
      activeDataSources = ['inventory', 'faq'];
    }

    console.log('[ai-agent-chat] Active data sources:', activeDataSources);

    // Fetch data based on active sources
    const contextData: Record<string, unknown> = {};

    // INVENTORY - Estoque de veículos
    if (activeDataSources.includes('inventory')) {
      console.log('[ai-agent-chat] Fetching vehicles from inventory...');
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, purchase_price, color, fuel_type, transmission, km, status, notes')
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false })
        .limit(50);

      if (vehiclesError) {
        console.error('[ai-agent-chat] Error fetching vehicles:', vehiclesError);
      } else {
        console.log('[ai-agent-chat] Found', vehicles?.length || 0, 'vehicles');
      }

      contextData.estoque = {
        total_disponiveis: vehicles?.length || 0,
        veiculos: vehicles?.map(v => ({
          id: v.id,
          veiculo: `${v.brand} ${v.model} ${v.version || ''} ${v.year_model || v.year_fabrication}`.trim(),
          preco: v.sale_price ? `R$ ${Number(v.sale_price).toLocaleString('pt-BR')}` : 'Consultar',
          preco_numerico: v.sale_price ? Number(v.sale_price) : null,
          cor: v.color,
          combustivel: v.fuel_type,
          cambio: v.transmission,
          km: v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : 'N/A',
          ano: v.year_model || v.year_fabrication,
          observacoes: v.notes,
        })) || [],
      };
    }

    // CRM - Leads
    if (activeDataSources.includes('crm')) {
      console.log('[ai-agent-chat] Fetching leads from CRM...');
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, phone, email, source, qualification_status, vehicle_interest, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (leadsError) {
        console.error('[ai-agent-chat] Error fetching leads:', leadsError);
      }

      const { data: leadStats } = await supabase
        .from('leads')
        .select('qualification_status');

      contextData.crm = {
        total_leads: leads?.length || 0,
        leads_qualificados: leadStats?.filter(l => l.qualification_status === 'qualificado').length || 0,
        leads_recentes: leads?.slice(0, 10).map(l => ({
          nome: l.name,
          telefone: l.phone,
          email: l.email,
          origem: l.source,
          status: l.qualification_status,
          interesse: l.vehicle_interest,
          notas: l.notes,
        })) || [],
      };
    }

    // NEGOTIATIONS - Negociações
    if (activeDataSources.includes('negotiations')) {
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select(`
          id, status, proposed_value, appointment_date, showed_up, notes,
          leads:lead_id (name, phone),
          vehicles:vehicle_id (brand, model, year)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      contextData.negociacoes = {
        total: negotiations?.length || 0,
        em_andamento: negotiations?.filter(n => n.status === 'em_negociacao').length || 0,
        lista: negotiations?.slice(0, 10).map(n => ({
          cliente: (n.leads as any)?.name || 'N/A',
          veiculo: n.vehicles ? `${(n.vehicles as any).brand} ${(n.vehicles as any).model} ${(n.vehicles as any).year}` : 'N/A',
          status: n.status,
          valor_proposto: n.proposed_value ? `R$ ${n.proposed_value.toLocaleString('pt-BR')}` : 'N/A',
          agendamento: n.appointment_date,
          compareceu: n.showed_up,
        })) || [],
      };
    }

    // SALES - Vendas
    if (activeDataSources.includes('sales')) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sales } = await supabase
        .from('sales')
        .select(`
          id, sale_price, sale_date, status,
          vehicles:vehicle_id (brand, model, year)
        `)
        .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('sale_date', { ascending: false });

      const totalReceita = sales?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0;

      contextData.vendas = {
        ultimos_30_dias: {
          total_vendas: sales?.length || 0,
          receita_total: `R$ ${totalReceita.toLocaleString('pt-BR')}`,
          ticket_medio: sales && sales.length > 0 ? `R$ ${(totalReceita / sales.length).toLocaleString('pt-BR')}` : 'N/A',
        },
        vendas_recentes: sales?.slice(0, 10).map(s => ({
          veiculo: s.vehicles ? `${(s.vehicles as any).brand} ${(s.vehicles as any).model} ${(s.vehicles as any).year}` : 'N/A',
          valor: `R$ ${(s.sale_price || 0).toLocaleString('pt-BR')}`,
          data: s.sale_date,
          status: s.status,
        })) || [],
      };
    }

    // FAQ / Knowledge Base
    if (activeDataSources.includes('faq')) {
      contextData.faq = {
        horario_funcionamento: 'Segunda a Sexta: 8h às 18h, Sábado: 8h às 14h',
        endereco: 'Rua Principal, 123 - Centro',
        formas_pagamento: ['À vista', 'Financiamento', 'Consórcio', 'Troca'],
        garantia: 'Todos os veículos possuem garantia de motor e câmbio',
        test_drive: 'Disponível mediante agendamento',
        documentacao: 'Toda documentação verificada e regularizada',
      };
    }

    // Build system prompt with context
    const defaultSystemPrompt = agentConfig?.system_prompt || `Você é um assistente virtual especializado em vendas de veículos da loja Matheus Veículos.

Seu objetivo é:
1. Receber o cliente de forma cordial e profissional
2. Identificar o interesse do cliente (qual veículo, orçamento, forma de pagamento)
3. Apresentar opções do estoque que correspondam ao interesse
4. Qualificar o lead coletando nome, telefone e e-mail
5. Agendar visita ou test-drive quando houver interesse

Regras importantes:
- Sempre seja educado e prestativo
- Use APENAS os dados fornecidos no contexto - nunca invente informações
- Se não souber algo, ofereça transferir para um vendedor humano
- Colete dados de contato de forma natural na conversa`;

    const contextString = Object.keys(contextData).length > 0 
      ? `\n\n=== DADOS ATUALIZADOS DO SISTEMA ===\n${JSON.stringify(contextData, null, 2)}\n=== FIM DOS DADOS ===\n\nUse estes dados para responder perguntas sobre estoque, preços, vendas, etc. Seja preciso e use os valores reais.`
      : '';

    const fullSystemPrompt = defaultSystemPrompt + contextString;

    // Build messages array
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...conversation_history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    console.log('[ai-agent-chat] Calling AI with context data:', Object.keys(contextData));

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agentConfig?.llm_model || "google/gemini-2.5-flash",
        messages,
        temperature: agentConfig?.temperature || 0.7,
        max_tokens: agentConfig?.max_tokens || 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-agent-chat] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log('[ai-agent-chat] Response generated successfully');

    return new Response(
      JSON.stringify({
        response: content,
        data_sources_used: Object.keys(contextData),
        tokens_used: aiResponse.usage?.total_tokens || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-agent-chat] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno',
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
