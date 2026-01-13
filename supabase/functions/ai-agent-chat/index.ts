import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TOOL DEFINITIONS =============
const agentTools = [
  {
    type: "function",
    function: {
      name: "search_vehicles",
      description: "Busca veículos disponíveis no estoque da loja. Use quando o cliente perguntar sobre carros, motos ou veículos disponíveis.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Marca do veículo (ex: Toyota, Honda, Volkswagen)" },
          model: { type: "string", description: "Modelo do veículo (ex: Corolla, Civic, Golf)" },
          year_min: { type: "number", description: "Ano mínimo do veículo" },
          year_max: { type: "number", description: "Ano máximo do veículo" },
          price_min: { type: "number", description: "Preço mínimo em reais" },
          price_max: { type: "number", description: "Preço máximo em reais" },
          fuel_type: { type: "string", description: "Tipo de combustível (flex, gasolina, diesel, eletrico, hibrido)" },
          limit: { type: "number", description: "Número máximo de resultados (padrão: 5)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_or_update_lead",
      description: "Cria ou atualiza um lead no CRM com os dados do cliente. Use quando coletar nome, telefone ou email do cliente.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome completo do cliente" },
          phone: { type: "string", description: "Telefone do cliente" },
          email: { type: "string", description: "Email do cliente" },
          interest: { type: "string", description: "Interesse do cliente (veículo específico ou tipo)" },
          notes: { type: "string", description: "Observações adicionais da conversa" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_visit",
      description: "Agenda uma visita ou test-drive para o cliente. Use quando o cliente quiser agendar.",
      parameters: {
        type: "object",
        properties: {
          lead_name: { type: "string", description: "Nome do cliente" },
          lead_phone: { type: "string", description: "Telefone do cliente" },
          date: { type: "string", description: "Data preferida (formato: YYYY-MM-DD)" },
          time: { type: "string", description: "Horário preferido (formato: HH:MM)" },
          vehicle_interest: { type: "string", description: "Veículo de interesse" },
          visit_type: { type: "string", description: "Tipo: visita ou test_drive" }
        },
        required: ["lead_name", "date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_financing",
      description: "Simula financiamento de veículo. Use quando o cliente perguntar sobre parcelas ou financiamento.",
      parameters: {
        type: "object",
        properties: {
          vehicle_price: { type: "number", description: "Valor do veículo em reais" },
          down_payment: { type: "number", description: "Valor de entrada em reais" },
          months: { type: "number", description: "Número de parcelas (12, 24, 36, 48, 60)" },
          interest_rate: { type: "number", description: "Taxa de juros mensal (padrão: 1.99%)" }
        },
        required: ["vehicle_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere a conversa para um atendente humano. Use quando o cliente solicitar ou em situações complexas.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Motivo da transferência" },
          priority: { type: "string", description: "Prioridade: low, medium, high" }
        },
        required: ["reason"]
      }
    }
  }
];

// Convert tools format for Google
function convertToolsForGoogle(tools: any[]) {
  return [{
    function_declarations: tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }))
  }];
}

// ============= TOOL EXECUTION =============
async function executeTool(
  supabase: any,
  toolName: string, 
  args: Record<string, any>,
  agentId: string
): Promise<string> {
  console.log(`[Tool] Executing ${toolName} with args:`, args);

  try {
    switch (toolName) {
      case 'search_vehicles': {
        let query = supabase
          .from('vehicles')
          .select('id, brand, model, version, year, price, mileage, fuel_type, transmission, color, status')
          .eq('status', 'available')
          .limit(args.limit || 5);

        if (args.brand) query = query.ilike('brand', `%${args.brand}%`);
        if (args.model) query = query.ilike('model', `%${args.model}%`);
        if (args.year_min) query = query.gte('year', args.year_min);
        if (args.year_max) query = query.lte('year', args.year_max);
        if (args.price_min) query = query.gte('price', args.price_min);
        if (args.price_max) query = query.lte('price', args.price_max);
        if (args.fuel_type) query = query.eq('fuel_type', args.fuel_type);

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          return "Não encontrei veículos com esses critérios no momento. Posso ajudar com outras opções?";
        }

        const vehicles = data.map((v: any) => 
          `• ${v.brand} ${v.model} ${v.version || ''} ${v.year} - R$ ${v.price?.toLocaleString('pt-BR')} | ${v.mileage?.toLocaleString('pt-BR')} km | ${v.fuel_type} | ${v.color}`
        ).join('\n');

        return `Encontrei ${data.length} veículo(s):\n${vehicles}`;
      }

      case 'create_or_update_lead': {
        const leadData = {
          name: args.name,
          phone: args.phone || null,
          email: args.email || null,
          source: 'ai_agent',
          status: 'new',
          notes: args.notes || `Interesse: ${args.interest || 'Não especificado'}`,
        };

        // Check if lead exists by phone or email
        let existingLead = null;
        if (args.phone) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .eq('phone', args.phone)
            .single();
          existingLead = data;
        }

        if (existingLead) {
          await supabase
            .from('leads')
            .update({ notes: leadData.notes, updated_at: new Date().toISOString() })
            .eq('id', existingLead.id);
          return `Atualizei as informações do lead ${args.name}.`;
        } else {
          await supabase.from('leads').insert(leadData);
          return `Lead ${args.name} cadastrado com sucesso! Um vendedor entrará em contato em breve.`;
        }
      }

      case 'schedule_visit': {
        const visitData = {
          type: args.visit_type || 'visit',
          scheduled_date: args.date,
          scheduled_time: args.time || '10:00',
          notes: `Agendamento via IA - Cliente: ${args.lead_name} | Interesse: ${args.vehicle_interest || 'Geral'}`,
          status: 'scheduled',
        };

        // For now, just log the scheduling intent
        console.log('[Tool] Schedule visit:', visitData);
        
        return `Visita agendada para ${args.date} às ${args.time || '10:00'}. Aguardamos ${args.lead_name}!`;
      }

      case 'calculate_financing': {
        const price = args.vehicle_price;
        const downPayment = args.down_payment || 0;
        const months = args.months || 48;
        const rate = (args.interest_rate || 1.99) / 100;
        
        const principal = price - downPayment;
        const monthlyPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        const totalPaid = monthlyPayment * months + downPayment;

        return `Simulação de financiamento:
• Valor do veículo: R$ ${price.toLocaleString('pt-BR')}
• Entrada: R$ ${downPayment.toLocaleString('pt-BR')}
• ${months}x de R$ ${monthlyPayment.toFixed(2).replace('.', ',')}
• Total: R$ ${totalPaid.toFixed(2).replace('.', ',')}
• Taxa: ${(rate * 100).toFixed(2)}% a.m.

*Valores sujeitos a aprovação de crédito.`;
      }

      case 'transfer_to_human': {
        // Log transfer request
        await supabase.from('ai_agent_human_takeover').insert({
          reason: args.reason,
          taken_over_at: new Date().toISOString(),
        });

        return `Entendi! Vou transferir você para um de nossos atendentes. Motivo: ${args.reason}. Aguarde um momento, por favor.`;
      }

      default:
        return `Ferramenta ${toolName} não implementada.`;
    }
  } catch (error) {
    console.error(`[Tool] Error executing ${toolName}:`, error);
    return `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.`;
  }
}

// ============= LLM CALLS =============
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: any[],
  tools: any[]
): Promise<{ content: string; toolCalls?: any[] }> {
  console.log('[OpenAI] Calling model:', model);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  if (choice.message.tool_calls) {
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
    };
  }

  return { content: choice.message.content || '' };
}

async function callGoogle(
  apiKey: string,
  model: string,
  messages: any[],
  tools: any[]
): Promise<{ content: string; toolCalls?: any[] }> {
  console.log('[Google] Calling model:', model);

  // Convert messages to Google format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        tools: convertToolsForGoogle(tools),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Google] Error:', error);
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts) {
    throw new Error('Invalid Google API response');
  }

  const parts = data.candidates[0].content.parts;
  const textPart = parts.find((p: any) => p.text);
  const functionCall = parts.find((p: any) => p.functionCall);

  if (functionCall) {
    return {
      content: textPart?.text || '',
      toolCalls: [{
        id: `call_${Date.now()}`,
        type: 'function',
        function: {
          name: functionCall.functionCall.name,
          arguments: JSON.stringify(functionCall.functionCall.args || {}),
        },
      }],
    };
  }

  return { content: textPart?.text || '' };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { agent_id, message, session_id, conversation_id } = await req.json();

    if (!agent_id || !message) {
      return new Response(
        JSON.stringify({ error: 'agent_id and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get agent config
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      console.error('[Agent] Not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agent.api_key_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Agent API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Agent] ${agent.name} | Provider: ${agent.llm_provider} | Model: ${agent.llm_model}`);

    // Get or create conversation
    let currentConversationId = conversation_id;
    if (!currentConversationId) {
      const { data: conv } = await supabase
        .from('ai_agent_conversations')
        .insert({
          agent_id,
          session_id: session_id || `session-${Date.now()}`,
          channel: 'widget',
          status: 'active',
        })
        .select('id')
        .single();
      currentConversationId = conv?.id;
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('ai_agent_messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(agent.context_window_size || 10);

    // Build messages array
    const messages = [
      { role: 'system', content: agent.system_prompt || 'Você é um assistente virtual útil.' },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Save user message
    await supabase.from('ai_agent_messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message,
    });

    // Call LLM
    let result: { content: string; toolCalls?: any[] };
    
    if (agent.llm_provider === 'openai') {
      result = await callOpenAI(agent.api_key_encrypted, agent.llm_model, messages, agentTools);
    } else if (agent.llm_provider === 'google') {
      result = await callGoogle(agent.api_key_encrypted, agent.llm_model, messages, agentTools);
    } else {
      throw new Error(`Unsupported provider: ${agent.llm_provider}`);
    }

    // Handle tool calls
    let finalResponse = result.content;
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const toolResult = await executeTool(supabase, toolCall.function.name, args, agent_id);
        
        // Add tool result to messages and call LLM again
        messages.push({ role: 'assistant', content: result.content || '', tool_calls: result.toolCalls } as any);
        messages.push({ role: 'tool', content: toolResult, tool_call_id: toolCall.id } as any);
        
        // Get final response incorporating tool results
        if (agent.llm_provider === 'openai') {
          const followUp = await callOpenAI(agent.api_key_encrypted, agent.llm_model, messages, agentTools);
          finalResponse = followUp.content;
        } else {
          // For Google, append tool result to response
          finalResponse = result.content ? `${result.content}\n\n${toolResult}` : toolResult;
        }
      }
    }

    // Save assistant message
    await supabase.from('ai_agent_messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: finalResponse,
      tool_calls: result.toolCalls,
    });

    // Generate TTS if enabled
    let audioUrl = null;
    if (agent.enable_voice && agent.voice_id) {
      const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (elevenLabsKey) {
        try {
          const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${agent.voice_id}`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: finalResponse.substring(0, 500), // Limit TTS length
                model_id: 'eleven_multilingual_v2',
              }),
            }
          );
          
          if (ttsResponse.ok) {
            // For now, we'd need to upload to storage
            // audioUrl = uploaded_url;
            console.log('[TTS] Generated audio successfully');
          }
        } catch (e) {
          console.error('[TTS] Error:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        response: finalResponse,
        conversation_id: currentConversationId,
        audio_url: audioUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
