import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// TOOL DEFINITIONS (OpenAI format for Lovable AI Gateway)
// =============================================
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "search_vehicles",
      description: "Busca veiculos disponiveis no estoque da loja. Use SEMPRE que o cliente perguntar sobre qualquer tipo de carro, marca, modelo, preco ou estoque. Para categorias como SUV, sedan, etc, use o campo 'keyword'. Se o cliente perguntar algo generico como 'o que voces tem?', use sem filtros.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Marca do veiculo (ex: Honda, Toyota, Volkswagen, Hyundai)" },
          model: { type: "string", description: "Modelo do veiculo (ex: Civic, Corolla, HB20, Compass)" },
          keyword: { type: "string", description: "Palavra-chave para busca ampla em modelo, versao e notas. Use para categorias como SUV, sedan, hatch, picape, etc." },
          min_price: { type: "number", description: "Preco minimo" },
          max_price: { type: "number", description: "Preco maximo" },
          max_km: { type: "number", description: "Quilometragem maxima" },
          year_min: { type: "number", description: "Ano minimo" },
          color: { type: "string", description: "Cor do veiculo" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicle_details",
      description: "Obtem detalhes completos de um veiculo especifico. Busca por ID ou modelo/marca.",
      parameters: {
        type: "object",
        properties: {
          vehicle_id: { type: "string", description: "ID UUID do veiculo" },
          model: { type: "string", description: "Nome do modelo do veiculo" },
          brand: { type: "string", description: "Marca do veiculo" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_vehicle_photos",
      description: "Envia de 3 a 4 fotos de um veiculo para o cliente via WhatsApp. Use SOMENTE quando o cliente PEDIR EXPLICITAMENTE fotos. NAO envie fotos automaticamente. Quando o cliente pedir MAIS fotos, use start_index para continuar de onde parou.",
      parameters: {
        type: "object",
        properties: {
          vehicle_id: { type: "string", description: "ID do veiculo para enviar as fotos." },
          caption: { type: "string", description: "Legenda curta das fotos" },
          start_index: { type: "number", description: "Indice inicial das fotos (0 = primeira leva, 4 = segunda leva). Use 0 na primeira vez." },
        },
        required: ["vehicle_id"],
      },
    },
  },
  // submit_qualification will be built dynamically based on qualification level
];

// Mark lead lost tool (static)
const markLeadLostTool = {
  type: "function",
  function: {
    name: "mark_lead_lost",
    description: "Marca o lead como PERDIDO quando o cliente deixa claro que nao quer comprar. Use quando o cliente disser 'nao quero', 'desisto', 'ja comprei', 'sem interesse', etc.",
    parameters: {
      type: "object",
      properties: {
        loss_reason: {
          type: "string",
          enum: ["sem_entrada", "sem_credito", "curioso", "caro", "comprou_outro", "desistiu", "sem_contato", "outros"],
          description: "Motivo da perda",
        },
        loss_notes: { type: "string", description: "Detalhes adicionais sobre o motivo" },
      },
      required: ["loss_reason"],
    },
  },
};

// Field mappings for qualification tool properties
const QUAL_FIELD_TO_TOOL_PROP: Record<string, { type: string; description: string }> = {
  nome: { type: "string", description: "Nome completo do cliente" },
  telefone: { type: "string", description: "Telefone do cliente" },
  veiculo_interesse: { type: "string", description: "Veiculo(s) de interesse do cliente" },
  origem: { type: "string", description: "Como o cliente encontrou a loja" },
  forma_pagamento: { type: "string", description: "Forma de pagamento preferida (financiamento, a vista, consorcio)" },
  orcamento: { type: "string", description: "Faixa de orcamento do cliente" },
  entrada: { type: "string", description: "Valor da entrada que o cliente tem disponivel" },
  parcela: { type: "string", description: "Valor de parcela desejada" },
  veiculo_troca: { type: "string", description: "Detalhes do veiculo de troca (marca, modelo, ano)" },
  tem_troca: { type: "boolean", description: "Se o cliente tem veiculo para troca" },
  cpf: { type: "string", description: "CPF do cliente" },
  nome_limpo: { type: "boolean", description: "Se o cliente tem nome limpo (SPC/Serasa)" },
  profissao: { type: "string", description: "Profissao do cliente" },
  renda: { type: "string", description: "Renda mensal do cliente" },
};

// Field display names in Portuguese
const QUAL_FIELD_LABELS: Record<string, string> = {
  nome: 'Nome', telefone: 'Telefone', veiculo_interesse: 'Veiculo de Interesse',
  origem: 'Origem', forma_pagamento: 'Forma de Pagamento', orcamento: 'Orcamento',
  entrada: 'Entrada', parcela: 'Parcela', veiculo_troca: 'Veiculo na Troca',
  tem_troca: 'Se tem Troca', cpf: 'CPF', nome_limpo: 'Nome Limpo',
  profissao: 'Profissao', renda: 'Renda',
};

function buildSubmitQualificationTool(requiredFields: string[], optionalFields: string[]): any {
  const allFields = [...requiredFields, ...optionalFields];
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const field of allFields) {
    const prop = QUAL_FIELD_TO_TOOL_PROP[field];
    if (prop) {
      // Map field names to tool-friendly parameter names
      properties[field] = { type: prop.type, description: prop.description };
      if (requiredFields.includes(field)) required.push(field);
    }
  }

  // Always include notes
  properties.notes = { type: "string", description: "Observacoes adicionais" };

  const requiredLabels = requiredFields.map(f => QUAL_FIELD_LABELS[f] || f).join(', ');
  const optionalLabels = optionalFields.map(f => QUAL_FIELD_LABELS[f] || f).join(', ');

  let description = `Envia a ficha de qualificacao do lead. CHAME APENAS UMA VEZ por conversa. Campos OBRIGATORIOS: ${requiredLabels}.`;
  if (optionalLabels) description += ` Campos opcionais (bonus): ${optionalLabels}.`;

  return {
    type: "function",
    function: {
      name: "submit_qualification",
      description,
      parameters: {
        type: "object",
        properties,
        required: required.length > 0 ? required : ["veiculo_interesse"],
      },
    },
  };
}

serve(async (req) => {
  console.log('[ai-agent-chat] Request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, agent_id, phone, lead_id, channel = 'api', customer_name, is_audio_input } = body;

    console.log('[ai-agent-chat] Processing:', { agent_id, message: message?.substring(0, 80), channel, phone });

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent config
    const { data: agent } = await supabase.from('ai_agents').select('*').eq('id', agent_id).single();
    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agente nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =============================================
    // SESSION & CONTEXT (uses ai_agent_conversations + ai_agent_messages)
    // =============================================
    const sessionId = `whatsapp_${phone || lead_id || crypto.randomUUID()}`;
    const SESSION_GAP_HOURS = 4;
    const sessionCutoff = new Date(Date.now() - SESSION_GAP_HOURS * 60 * 60 * 1000).toISOString();

    // Find or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('ai_agent_conversations')
      .select('id, updated_at')
      .eq('agent_id', agent_id)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isNewSession = !existingConv ||
      new Date(existingConv.updated_at).getTime() < new Date(sessionCutoff).getTime();

    if (isNewSession && existingConv) {
      // Close old conversation, create new one
      await supabase.from('ai_agent_conversations').update({ status: 'closed' }).eq('id', existingConv.id);
    }

    if (isNewSession || !existingConv) {
      console.log('[ai-agent-chat] Creating NEW conversation (gap > 4h or first contact)');
      const { data: newConv, error: convError } = await supabase
        .from('ai_agent_conversations')
        .insert({
          agent_id,
          session_id: sessionId,
          channel: channel || 'whatsapp',
          lead_id: lead_id || null,
          customer_phone: phone || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[ai-agent-chat] Error creating conversation:', convError);
        throw new Error('Failed to create conversation');
      }
      conversationId = newConv.id;
    } else {
      conversationId = existingConv.id;
      // Touch updated_at
      await supabase.from('ai_agent_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    }

    if (isNewSession) console.log('[ai-agent-chat] NEW SESSION detected (gap > 4h or first contact)');

    // Extract last vehicle_id discussed
    let lastVehicleContext = '';
    if (!isNewSession) {
      const { data: recentMessages } = await supabase
        .from('ai_agent_messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentMessages) {
        for (const msg of recentMessages) {
          const idMatch = msg.content?.match(/vehicle_id[=:]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (idMatch) {
            lastVehicleContext = `\nULTIMO VEICULO DISCUTIDO (vehicle_id): ${idMatch[1]}. Se o cliente pedir "mais fotos", use ESTE vehicle_id.`;
            break;
          }
        }
      }
    }

    // Fetch conversation history, inventory, lead, AND qualification settings IN PARALLEL
    const contextWindowSize = agent.context_window_size || 20;
    const [historyResult, inventoryResult, leadResult, qualCurrentResult, qualLevelsResult] = await Promise.all([
      supabase
        .from('ai_agent_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(contextWindowSize),
      supabase
        .from('vehicles')
        .select('brand, model, year_model, sale_price')
        .eq('status', 'disponivel')
        .order('brand', { ascending: true }),
      lead_id
        ? supabase.from('leads').select('id, name, phone, status, vehicle_interest').eq('id', lead_id).single()
        : Promise.resolve({ data: null }),
      // Fetch CURRENT active qualification level
      supabase
        .from('qualification_settings')
        .select('required_fields')
        .eq('level', 'CURRENT')
        .single(),
      // Fetch all Q1/Q2/Q3 definitions
      supabase
        .from('qualification_settings')
        .select('level, name, required_fields, optional_fields, description')
        .in('level', ['Q1', 'Q2', 'Q3'])
        .order('level', { ascending: true }),
    ]);

    const conversationHistory = (historyResult.data || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build COMPACT inventory context
    const brandMap: Record<string, { count: number; minPrice: number; maxPrice: number; models: Set<string> }> = {};
    for (const v of (inventoryResult.data || [])) {
      const key = v.brand || 'Outros';
      if (!brandMap[key]) brandMap[key] = { count: 0, minPrice: Infinity, maxPrice: 0, models: new Set() };
      brandMap[key].count++;
      brandMap[key].models.add(v.model);
      if (v.sale_price) {
        brandMap[key].minPrice = Math.min(brandMap[key].minPrice, v.sale_price);
        brandMap[key].maxPrice = Math.max(brandMap[key].maxPrice, v.sale_price);
      }
    }
    const inventoryContext = Object.entries(brandMap).map(([brand, info]) => {
      const priceRange = info.minPrice < Infinity ? `R$${(info.minPrice / 1000).toFixed(0)}k-${(info.maxPrice / 1000).toFixed(0)}k` : 'Consulte';
      return `- ${brand}: ${info.count}x (${[...info.models].slice(0, 4).join(', ')}) ${priceRange}`;
    }).join('\n');

    // Lead context
    const leadData = leadResult.data;
    const leadInfo = leadData?.name && !leadData.name.includes('Lead WhatsApp') && !leadData.name.includes('Lead ')
      ? `O cliente se chama ${leadData.name}. Mas CONFIRME o nome, pode estar errado.`
      : 'Voce ainda nao sabe o nome do cliente. Descubra naturalmente.';
    const vehicleInfo = (!isNewSession && leadData?.vehicle_interest) ? `O cliente demonstrou interesse em: ${leadData.vehicle_interest}` : '';

    const sessionNote = isNewSession
      ? '\nEsta e uma NOVA CONVERSA. Trate como primeiro contato. NAO assuma nenhum veiculo ou pagamento de conversas anteriores. Comece do zero.'
      : '';

    // =============================================
    // QUALIFICATION LEVEL CONFIGURATION (dynamic from DB)
    // =============================================
    const activeLevel = qualCurrentResult.data?.required_fields?.[0] || 'Q2';
    const qualLevels = (qualLevelsResult.data || []) as any[];
    const activeQualConfig = qualLevels.find((q: any) => q.level === activeLevel);
    
    const qualRequiredFields: string[] = activeQualConfig?.required_fields || ['veiculo_interesse', 'forma_pagamento', 'tem_troca'];
    const qualOptionalFields: string[] = activeQualConfig?.optional_fields || [];
    const qualLevelName = activeQualConfig?.name || activeLevel;
    const qualLevelDescription = activeQualConfig?.description || '';

    console.log('[ai-agent-chat] Active qualification level:', activeLevel, 'required:', qualRequiredFields, 'optional:', qualOptionalFields);

    // Build dynamic qualification prompt section
    const requiredLabels = qualRequiredFields.map(f => QUAL_FIELD_LABELS[f] || f);
    const optionalLabels = qualOptionalFields.map(f => QUAL_FIELD_LABELS[f] || f);

    let qualPromptSection = `===== QUALIFICACAO (Nivel ${activeLevel} - ${qualLevelName}) =====\n`;
    if (qualLevelDescription) qualPromptSection += `${qualLevelDescription}\n`;
    qualPromptSection += `Para qualificar o lead, voce PRECISA coletar estas informacoes OBRIGATORIAS:\n`;
    qualPromptSection += requiredLabels.map((l, i) => `  ${i + 1}. ${l}`).join('\n');
    if (optionalLabels.length > 0) {
      qualPromptSection += `\n\nInformacoes OPCIONAIS (bonus, colete se surgir naturalmente):\n`;
      qualPromptSection += optionalLabels.map(l => `  - ${l}`).join('\n');
    }
    qualPromptSection += `\n\nQUANDO tiver TODOS os campos obrigatorios, chame submit_qualification UMA UNICA VEZ.`;
    qualPromptSection += `\nSe submit_qualification ja foi chamado, NUNCA chame novamente.`;
    qualPromptSection += `\nApos qualificar, avise que um consultor vai entrar em contato.`;

    // Build dynamic tools array
    const submitQualTool = buildSubmitQualificationTool(qualRequiredFields, qualOptionalFields);
    const dynamicTools = [...toolDefinitions, submitQualTool, markLeadLostTool];

    console.log('[ai-agent-chat] Conversation:', conversationId, 'history:', conversationHistory.length);

    // Save user message (BLOCKING - must complete before AI call)
    const { error: userMsgError } = await supabase.from('ai_agent_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });
    if (userMsgError) console.error('Error saving user msg:', userMsgError);

    // =============================================
    // BUILD SYSTEM PROMPT (adapted from Roma)
    // =============================================
    const systemPrompt = `Voce e a Gabi, vendedora da Matheus Veiculos. Voce conversa com clientes pelo WhatsApp como uma pessoa real. Ninguem pode desconfiar que voce e uma IA. Voce e simpatica, leve, descontraida, mas profissional. Voce gosta de carros e entende do assunto.

===== SOBRE A LOJA =====
- Matheus Veiculos vende CARROS
- Aceita veiculo na troca
- Formas de pagamento: financiamento, a vista, consorcio
- Horario: Seg a Sex 08h as 18h / Sabado 08h as 14h

===== COMO VOCE FALA (PRIORIDADE MAXIMA) =====
Voce fala como uma pessoa real no WhatsApp. Isso significa:
- Mensagens CURTAS. Maximo 200 caracteres por balao.
- SEMPRE divida sua resposta em 2 ou 3 baloes usando |||. Nunca mande 1 balao sozinho e nunca mande mais que 3.
- Exemplo do ritmo certo:
  "Oi Victor, tudo bem? Sou a Gabi da Matheus Veiculos! ||| Vi que voce curtiu o City, bonito demais ne? Ja conhecia ele?"
- Outro exemplo:
  "Achei aqui pra voce! Tem um City 2013 automatico, ta novinho ||| Quer que eu mande umas fotos pra voce dar uma olhada?"
- Fale como se estivesse digitando rapido no celular
- Use girias leves quando fizer sentido: show, massa, top, beleza, da hora
- NUNCA use emoji em nenhuma circunstancia
- NUNCA faca mais de 1 pergunta por mensagem. Escolha a mais importante.
- Nao use linguagem formal. Nada de "prezado", "estimado", "seria possivel".
- Nao use pontos de exclamacao demais. Maximo 1 por mensagem.

===== PRIMEIRA MENSAGEM =====
Quando um cliente falar com voce pela primeira vez:
1. Cumprimente de forma natural e se apresente
2. Pergunte o NOME do cliente (isso e obrigatorio, sempre pergunte o nome antes de qualquer coisa)
3. Se o cliente ja mencionou um veiculo, pergunte o nome E ja demonstre que sabe qual carro ele viu
Exemplo: "Oi, tudo bem? Sou a Gabi da Matheus Veiculos! Me fala seu nome? ||| Vi que voce curtiu o Civic, e lindo ne?"
IMPORTANTE: Mesmo que o sistema ja tenha um nome cadastrado, SEMPRE pergunte o nome. O nome cadastrado pode estar errado.

===== COMO VOCE VENDE (VENDA CONSULTIVA) =====
Voce NAO e uma vendedora insistente. Voce e uma consultora que ajuda o cliente a encontrar o veiculo certo.

O fluxo natural de uma conversa e:
1. RAPPORT: Cumprimentar, pegar o nome, criar conexao
2. DESCOBERTA: Entender o que o cliente busca
3. APRESENTACAO: Mostrar opcoes reais do estoque
4. APROFUNDAMENTO: Coletar informacoes para qualificacao (veja secao QUALIFICACAO abaixo)
5. QUALIFICACAO: Quando tiver TODOS os campos obrigatorios, chamar submit_qualification
6. HANDOFF: Avisar que um consultor vai continuar o atendimento

REGRAS DO FLUXO:
- NUNCA pule etapas. Nao pergunte sobre troca antes de apresentar o veiculo.
- Cada mensagem do cliente e uma oportunidade de colher 1 informacao nova. Nao tente pegar tudo de uma vez.
- Se o cliente der uma resposta curta (ta, ok, sim), avance naturalmente.

${qualPromptSection}

===== USO DE TOOLS — ESTOQUE =====
REGRA CRITICA: Se o cliente mencionar QUALQUER veiculo, voce DEVE chamar search_vehicles IMEDIATAMENTE.
- NAO pergunte "qual modelo?" antes de buscar. Busque primeiro e mostre as opcoes.
- Se o cliente diz "gostei do Honda" → busque todos os Honda
- Se o cliente diz "quero um SUV" → busque SUVs
- Se o cliente diz "to procurando algo ate 80 mil" → busque veiculos nessa faixa

Quando apresentar resultados do estoque:
- Use APENAS dados reais retornados pela tool
- NUNCA invente preco, km, cor ou qualquer dado
- Apresente 1 ou 2 opcoes por mensagem (nao jogue uma lista)
- Se NAO retornar resultados, diga que no momento nao tem, sugira alternativas

===== USO DE TOOLS — FOTOS =====
- NAO envie fotos automaticamente. Envie APENAS quando o cliente pedir.
- Quando o cliente pedir fotos, use send_vehicle_photos com o vehicle_id correto
- Apos enviar fotos, SEMPRE faca uma pergunta para continuar a conversa
- Se nao tiver fotos disponiveis, avise

===== LEAD PERDIDO =====
- Se o cliente deixar CLARO que nao quer, chame mark_lead_lost IMEDIATAMENTE
- Apos marcar como perdido, se despeca educadamente. Nao insista.

===== SITUACOES ESPECIAIS =====
CLIENTE PEDE DESCONTO:
- Voce nao tem poder pra dar desconto. Faca uma brincadeira leve.
- Diga que vai passar pro gerente avaliar.

CLIENTE SUMIU E VOLTOU:
- Faca uma brincadeira leve pra quebrar o gelo
- Retome de onde parou

CLIENTE PERGUNTA ALGO QUE VOCE NAO SABE:
- NUNCA invente. Diga que vai confirmar com a equipe.
- NUNCA revele que e uma IA

===== REGRAS ABSOLUTAS (NUNCA VIOLAR) =====
1. SEMPRE pergunte o nome do cliente na primeira interacao
2. SEMPRE use search_vehicles antes de falar sobre qualquer veiculo
3. NUNCA invente dados de veiculos
4. NUNCA revele que e uma IA
5. NUNCA use emoji
6. NUNCA faca mais de 1 pergunta por mensagem
7. SEMPRE divida a resposta em 2 ou 3 baloes com |||
8. SEMPRE chame o cliente pelo nome depois de saber
9. Idioma: PT-BR sempre
10. Se submit_qualification ja foi chamado, NUNCA chame de novo

===== ESTOQUE ATUAL =====
${inventoryContext || 'Use a ferramenta search_vehicles para consultar o estoque atualizado.'}

===== CONTEXTO DO LEAD =====
${leadInfo}
${vehicleInfo}${lastVehicleContext}${sessionNote}
Interacoes nesta sessao: ${conversationHistory.length}`;

    // =============================================
    // AI API CALL WITH TOOL CALLING LOOP
    // =============================================
    const aiMessages: Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const temperature = Math.min(agent.temperature || 0.6, 0.7);
    const maxTokens = agent.max_tokens || 512;
    const MAX_ROUNDS = 3;
    let round = 0;
    let responseMessage = '';
    let photosToSend: Array<{ url: string; caption: string }> = [];
    let toolCallsLog: string[] = [];

    try {
      while (round < MAX_ROUNDS) {
        round++;
        console.log(`[ai-agent-chat] Round ${round}, messages: ${aiMessages.length}`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: systemPrompt }, ...aiMessages],
            tools: dynamicTools,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('[ai-agent-chat] AI error:', aiResponse.status, errorText);
          if (aiResponse.status === 429) throw new Error("Rate limit exceeded");
          if (aiResponse.status === 402) throw new Error("Credits exhausted");
          throw new Error(`AI error: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        const choice = data.choices?.[0];
        const assistantMsg = choice?.message;

        if (!assistantMsg) break;

        // Check if there are tool calls
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          // Add assistant message with tool calls to history
          aiMessages.push({
            role: 'assistant',
            content: assistantMsg.content || '',
            tool_calls: assistantMsg.tool_calls,
          });

          // Execute each tool call
          for (const toolCall of assistantMsg.tool_calls) {
            const fnName = toolCall.function?.name;
            let fnArgs: any = {};
            try { fnArgs = JSON.parse(toolCall.function?.arguments || '{}'); } catch {}

            console.log(`[ai-agent-chat] Executing tool: ${fnName}`, fnArgs);
            toolCallsLog.push(fnName);

            const toolResult = await executeToolCall(supabase, fnName, fnArgs, phone, photosToSend, agent_id);

            aiMessages.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
              name: fnName,
            });
          }
          // Continue loop to get final text
        } else {
          // No tool calls — final text response
          responseMessage = assistantMsg.content || '';
          break;
        }
      }

      // If we ran out of rounds without text, do one more call without tools
      if (!responseMessage && round >= MAX_ROUNDS) {
        console.log('[ai-agent-chat] Max rounds, getting final text...');
        const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: systemPrompt }, ...aiMessages],
            temperature,
            max_tokens: maxTokens,
          }),
        });
        if (finalResponse.ok) {
          const finalData = await finalResponse.json();
          responseMessage = finalData.choices?.[0]?.message?.content || '';
        }
      }

      // Retry if empty
      if (!responseMessage || responseMessage.trim().length === 0) {
        console.warn('[ai-agent-chat] Empty response, retrying with nudge...');
        const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              ...aiMessages,
              { role: 'user', content: 'IMPORTANTE: O cliente esta esperando uma resposta. Responda com texto em portugues.' },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          responseMessage = retryData.choices?.[0]?.message?.content || '';
        }
        if (!responseMessage) responseMessage = 'Oi! Me conta o que voce esta procurando que eu busco aqui no estoque.';
      }

    } catch (aiError) {
      console.error('[ai-agent-chat] AI error:', aiError);
      responseMessage = 'Oi! Estou aqui para te ajudar. Me conta o que voce esta procurando.';
    }

    // =============================================
    // ENFORCE RESPONSE LIMITS (from Roma)
    // =============================================
    responseMessage = enforceResponseLimits(responseMessage, 600, 3);

    // Save assistant response (BLOCKING)
    const { error: assistantMsgError } = await supabase.from('ai_agent_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: responseMessage,
    });
    if (assistantMsgError) console.error('Error saving assistant msg:', assistantMsgError);

    // Deduplicate photos
    const seenUrls = new Set<string>();
    const uniquePhotos = photosToSend.filter(p => {
      if (seenUrls.has(p.url)) return false;
      seenUrls.add(p.url);
      return true;
    });

    console.log('[ai-agent-chat] Response generated, photos:', uniquePhotos.length);

    return new Response(
      JSON.stringify({
        message: responseMessage,
        photos: uniquePhotos,
        tool_calls: toolCallsLog,
        lead_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-agent-chat] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno',
        message: 'Desculpe, tive um problema tecnico. Um vendedor vai te atender em breve.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================
// EXECUTE TOOL CALL
// =============================================
async function executeToolCall(
  supabase: any,
  functionName: string,
  args: any,
  customerPhone?: string,
  photosToSend?: Array<{ url: string; caption: string }>,
  agentId?: string,
): Promise<any> {
  console.log(`[ai-agent-chat] Executing ${functionName}:`, args);

  switch (functionName) {
    case 'search_vehicles': {
      let query = supabase
        .from('vehicles')
        .select('id, brand, model, version, year_model, year_fabrication, color, km, sale_price, fuel_type, transmission, images, status, notes')
        .eq('status', 'disponivel');

      const generateVariants = (term: string): string[] => {
        const variants = new Set<string>();
        variants.add(term);
        variants.add(term.replace(/-/g, ' '));
        variants.add(term.replace(/-/g, ''));
        variants.add(term.replace(/\s+/g, '-'));
        variants.add(term.replace(/\s+/g, ''));
        return [...variants].filter(v => v.length > 0);
      };

      if (args.brand) query = query.ilike('brand', `%${args.brand}%`);
      if (args.model) {
        const modelVariants = generateVariants(args.model);
        if (modelVariants.length > 1) {
          query = query.or(modelVariants.map(v => `model.ilike.%${v}%`).join(','));
        } else {
          query = query.ilike('model', `%${args.model}%`);
        }
      }
      if (args.keyword) {
        const categoryMap: Record<string, string[]> = {
          'suv': ['Compass', 'Renegade', 'Tracker', 'Creta', 'Kicks', 'T-Cross', 'Nivus', 'Pulse', 'Duster', 'HR-V', 'CR-V', 'Tucson', 'IX35', 'Tiguan', 'Taos', 'EcoSport', 'Territory'],
          'sedan': ['Civic', 'Corolla', 'Cruze', 'Sentra', 'Versa', 'City', 'Jetta', 'Passat', 'Prisma', 'Cobalt', 'Logan'],
          'hatch': ['Onix', 'Polo', 'Gol', 'HB20', 'Argo', 'Mobi', 'Uno', 'Kwid', 'Fit', 'Golf', 'Fox'],
          'picape': ['Hilux', 'Ranger', 'Amarok', 'S10', 'Montana', 'Toro', 'Strada', 'Saveiro', 'Frontier'],
          'popular': ['Mobi', 'Kwid', 'Uno', 'Gol', 'Onix', 'HB20', 'Argo', 'Ka', 'Fox'],
        };

        const keyword = args.keyword.toLowerCase().trim();
        const mappedModels = categoryMap[keyword];

        if (mappedModels) {
          query = query.or(mappedModels.map(m => `model.ilike.%${m}%`).join(','));
        } else {
          const kwVariants = generateVariants(args.keyword);
          const orParts = kwVariants.flatMap(v => [
            `model.ilike.%${v}%`, `version.ilike.%${v}%`, `notes.ilike.%${v}%`, `brand.ilike.%${v}%`,
          ]);
          query = query.or(orParts.join(','));
        }
      }
      if (args.min_price) query = query.gte('sale_price', args.min_price);
      if (args.max_price) query = query.lte('sale_price', args.max_price);
      if (args.max_km) query = query.lte('km', args.max_km);
      if (args.year_min) query = query.gte('year_model', args.year_min);
      if (args.color) query = query.ilike('color', `%${args.color}%`);

      const { data, error } = await query.limit(10);

      if (error) return { error: 'Erro ao buscar veiculos', vehicles: [] };
      if (!data || data.length === 0) {
        // Fallback broader search
        const fallbackTerm = (args.model || args.keyword || '').replace(/[-_]/g, ' ').trim();
        if (fallbackTerm.length >= 2) {
          const { data: fallbackData } = await supabase
            .from('vehicles')
            .select('id, brand, model, version, year_model, year_fabrication, color, km, sale_price, fuel_type, transmission, images')
            .eq('status', 'disponivel')
            .or(`model.ilike.%${fallbackTerm}%,brand.ilike.%${fallbackTerm}%`)
            .limit(10);

          if (fallbackData && fallbackData.length > 0) {
            return {
              total: fallbackData.length,
              vehicles: fallbackData.map((v: any) => ({
                id: v.id, marca: v.brand, modelo: v.model, versao: v.version,
                ano: `${v.year_fabrication}/${v.year_model}`, cor: v.color,
                km: v.km ? `${v.km.toLocaleString('pt-BR')} km` : 'Nao informado',
                preco: v.sale_price ? `R$ ${v.sale_price.toLocaleString('pt-BR')}` : 'Consulte',
                combustivel: v.fuel_type, cambio: v.transmission,
                tem_fotos: v.images && v.images.length > 0,
              })),
            };
          }
        }
        return { message: 'Nenhum veiculo encontrado', vehicles: [], suggestion: 'Tente buscar por outras marcas ou modelos' };
      }

      return {
        total: data.length,
        vehicles: data.map((v: any) => ({
          id: v.id, marca: v.brand, modelo: v.model, versao: v.version,
          ano: `${v.year_fabrication}/${v.year_model}`, cor: v.color,
          km: v.km ? `${v.km.toLocaleString('pt-BR')} km` : 'Nao informado',
          preco: v.sale_price ? `R$ ${v.sale_price.toLocaleString('pt-BR')}` : 'Consulte',
          combustivel: v.fuel_type, cambio: v.transmission,
          tem_fotos: v.images && v.images.length > 0,
        })),
      };
    }

    case 'get_vehicle_details': {
      let query = supabase.from('vehicles').select('*').eq('status', 'disponivel');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (args.vehicle_id && uuidRegex.test(args.vehicle_id)) {
        query = query.eq('id', args.vehicle_id);
      } else if (args.model || args.vehicle_id) {
        const searchTerm = args.model || args.vehicle_id;
        query = query.or(`model.ilike.%${searchTerm}%,version.ilike.%${searchTerm}%`);
      } else if (args.brand) {
        query = query.ilike('brand', `%${args.brand}%`);
      } else {
        return { error: 'Especifique ID, modelo ou marca' };
      }

      const { data, error } = await query.limit(5);
      if (error) return { error: 'Erro ao buscar veiculo' };
      if (!data || data.length === 0) return { error: 'Nenhum veiculo encontrado' };

      if (data.length > 1) {
        return {
          message: `Encontrei ${data.length} veiculos:`,
          veiculos: data.map((v: any) => ({
            id: v.id, marca: v.brand, modelo: v.model, versao: v.version,
            ano: `${v.year_fabrication}/${v.year_model}`, cor: v.color,
            km: v.km ? `${v.km.toLocaleString('pt-BR')} km` : 'Nao informado',
            preco: v.sale_price ? `R$ ${v.sale_price.toLocaleString('pt-BR')}` : 'Consulte',
            tem_fotos: v.images && v.images.length > 0,
          })),
        };
      }

      const vehicle = data[0];
      return {
        id: vehicle.id, marca: vehicle.brand, modelo: vehicle.model, versao: vehicle.version,
        ano: `${vehicle.year_fabrication}/${vehicle.year_model}`, cor: vehicle.color,
        km: vehicle.km ? `${vehicle.km.toLocaleString('pt-BR')} km` : 'Nao informado',
        preco: vehicle.sale_price ? `R$ ${vehicle.sale_price.toLocaleString('pt-BR')}` : 'Consulte',
        combustivel: vehicle.fuel_type, cambio: vehicle.transmission,
        tem_fotos: vehicle.images && vehicle.images.length > 0,
        total_fotos: vehicle.images?.length || 0,
      };
    }

    case 'send_vehicle_photos':
    case 'send_vehicle_photo': {
      // Try by ID first
      let vehicle: any = null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (args.vehicle_id && uuidRegex.test(args.vehicle_id)) {
        const { data } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_model, sale_price, images')
          .eq('id', args.vehicle_id)
          .single();
        vehicle = data;
      }

      // FALLBACK: AI often hallucinates UUIDs. Search by caption/model instead.
      if (!vehicle) {
        console.log('[send_vehicle_photos] Vehicle ID not found, trying fallback search by caption:', args.caption);
        const searchTerm = args.caption || args.vehicle_id || '';
        // Extract meaningful words (brand/model) from caption
        const words = searchTerm.split(/[\s,]+/).filter((w: string) => w.length >= 3);
        
        if (words.length > 0) {
          // Try each word as brand or model
          const orClauses = words.flatMap((w: string) => [`model.ilike.%${w}%`, `brand.ilike.%${w}%`]);
          const { data: fallbackVehicles } = await supabase
            .from('vehicles')
            .select('id, brand, model, version, year_model, sale_price, images')
            .eq('status', 'disponivel')
            .or(orClauses.join(','))
            .limit(1);
          
          if (fallbackVehicles && fallbackVehicles.length > 0) {
            vehicle = fallbackVehicles[0];
            console.log('[send_vehicle_photos] Fallback found:', vehicle.brand, vehicle.model, vehicle.id);
          }
        }
      }

      if (!vehicle) return { success: false, error: 'Veiculo nao encontrado. Use o ID retornado por search_vehicles.' };

      // Try vehicle_images table first, then legacy images array
      let photoUrls: string[] = [];
      
      const { data: categorizedPhotos } = await supabase
        .from('vehicle_images')
        .select('image_url')
        .eq('vehicle_id', vehicle.id)
        .order('created_at', { ascending: true });
      
      if (categorizedPhotos && categorizedPhotos.length > 0) {
        photoUrls = categorizedPhotos.map((p: any) => p.image_url).filter(Boolean);
      }
      
      // Fallback to legacy images array
      if (photoUrls.length === 0) {
        photoUrls = vehicle.images?.filter((img: string) => img) || [];
      }

      if (photoUrls.length === 0) {
        return { success: false, error: 'Este veiculo nao tem fotos disponiveis no momento.' };
      }

      const startIndex = args.start_index || 0;
      const photoBatch = photoUrls.slice(startIndex, startIndex + 4);

      if (photoBatch.length === 0) {
        return { success: true, message: 'Ja enviei todas as fotos disponiveis desse veiculo.' };
      }

      const caption = args.caption || `${vehicle.brand} ${vehicle.model} ${vehicle.version || ''} ${vehicle.year_model}`.trim();
      
      if (photosToSend) {
        for (const url of photoBatch) {
          photosToSend.push({ url, caption });
        }
      }

      const hasMore = startIndex + 4 < photoUrls.length;
      return {
        success: true,
        photos_sent: photoBatch.length,
        total_photos: photoUrls.length,
        has_more: hasMore,
        next_start_index: hasMore ? startIndex + 4 : null,
        message: `${photoBatch.length} foto(s) enviada(s).${hasMore ? ` Ainda tem mais ${photoUrls.length - startIndex - 4} foto(s).` : ' Essas sao todas as fotos.'}`,
        vehicle_id: vehicle.id,
      };
    }

    case 'submit_qualification': {
      if (!customerPhone) return { success: false, error: 'Phone not available' };

      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lead) return { success: false, error: 'Lead nao encontrado' };

      // Build qualification_data with ALL collected info
      const qualificationData: Record<string, any> = {};
      if (args.vehicle_interest) qualificationData.vehicle_interest = args.vehicle_interest;
      if (args.payment_method) qualificationData.payment_method = args.payment_method;
      if (args.has_trade_in !== undefined) qualificationData.has_trade_in = args.has_trade_in;
      if (args.trade_in_details) qualificationData.trade_in_details = args.trade_in_details;
      if (args.budget_range) qualificationData.budget_range = args.budget_range;
      if (args.notes) qualificationData.notes = args.notes;
      qualificationData.qualified_at = new Date().toISOString();
      qualificationData.qualified_by = 'ai_agent';

      // Update lead with qualification_data
      await supabase.from('leads').update({
        vehicle_interest: args.vehicle_interest,
        qualification_data: qualificationData,
        qualification_level: 'Q2',
        status: 'qualificado',
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);

      // Update negotiation
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('id')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (negotiation) {
        await supabase.from('negotiations').update({
          status: 'negociando',
          qualification_level: 'Q2',
          notes: `Qualificado pela IA | Veiculo: ${args.vehicle_interest} | Pagamento: ${args.payment_method}${args.has_trade_in ? ` | Troca: ${args.trade_in_details || 'Sim'}` : ' | Sem troca'}`,
          updated_at: new Date().toISOString(),
        }).eq('id', negotiation.id);
      }

      // Assign via round robin
      const { data: nextSalesperson } = await supabase.rpc('get_next_round_robin_salesperson');

      if (nextSalesperson) {
        await supabase.from('leads').update({ assigned_to: nextSalesperson, updated_at: new Date().toISOString() }).eq('id', lead.id);
        if (negotiation) {
          await supabase.from('negotiations').update({ salesperson_id: nextSalesperson }).eq('id', negotiation.id);
        }
        await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: nextSalesperson });

        const { data: salesperson } = await supabase.from('profiles').select('full_name, phone').eq('id', nextSalesperson).single();
        const salespersonName = salesperson?.full_name || 'nosso consultor';

        // Notification in-app
        await supabase.from('notifications').insert({
          user_id: nextSalesperson,
          type: 'lead_assigned',
          title: 'Novo Lead Qualificado pela IA',
          message: `Lead qualificado: ${args.vehicle_interest} | Pagamento: ${args.payment_method}`,
          link: '/crm',
        });

        // ===== SEND FICHA COMPLETA VIA WHATSAPP TO SALESPERSON =====
        if (salesperson?.phone) {
          try {
            // Find connected WhatsApp instance
            const { data: wpInstances } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name, api_url, api_key')
              .eq('status', 'connected')
              .order('is_shared', { ascending: false })
              .order('is_default', { ascending: false })
              .limit(1);

            const wpInstance = wpInstances?.[0];
            if (wpInstance) {
              // 1. Get conversation history for AI summary
              let conversationSummary = '';
              let messageCount = 0;
              let firstMsgTime = '';
              try {
                const { data: convForSummary } = await supabase
                  .from('ai_agent_conversations')
                  .select('id, created_at')
                  .eq('lead_id', lead.id)
                  .eq('status', 'active')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                if (convForSummary) {
                  firstMsgTime = convForSummary.created_at;
                  const { data: histMsgs } = await supabase
                    .from('ai_agent_messages')
                    .select('role, content')
                    .eq('conversation_id', convForSummary.id)
                    .order('created_at', { ascending: true });

                  if (histMsgs && histMsgs.length > 0) {
                    messageCount = histMsgs.filter((m: any) => m.role === 'user').length;
                    
                    // Use AI to generate strategic summary
                    const summaryPrompt = `Analise esta conversa entre um vendedor de carros e um cliente. Gere um resumo ESTRATEGICO para o vendedor que vai assumir a negociacao. Inclua:
1. RESUMO (2-3 frases do que aconteceu na conversa)
2. PERFIL DO CLIENTE (o que sabemos sobre ele - urgencia, perfil financeiro, experiencia com carros)
3. DICAS DE ABORDAGEM (como o vendedor deve abordar esse cliente baseado na conversa)

Seja direto e pratico. Maximo 400 caracteres no total. Sem markdown, sem asteriscos, sem formatacao especial.

Conversa:
${histMsgs.map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Gabi'}: ${m.content}`).join('\n')}`;

                    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${LOVABLE_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: 'google/gemini-2.5-flash',
                        messages: [{ role: 'user', content: summaryPrompt }],
                        temperature: 0.3,
                        max_tokens: 300,
                      }),
                    });

                    if (summaryResponse.ok) {
                      const summaryData = await summaryResponse.json();
                      conversationSummary = summaryData.choices?.[0]?.message?.content || '';
                    }
                  }
                }
              } catch (summaryErr) {
                console.error('[ai-agent-chat] Error generating summary:', summaryErr);
              }

              // 2. Find similar vehicles in stock
              let similarVehicles = '';
              try {
                const searchTerms = (args.vehicle_interest || '').split(/\s+/).filter((w: string) => w.length >= 3);
                if (searchTerms.length > 0) {
                  const orClauses = searchTerms.flatMap((w: string) => [`model.ilike.%${w}%`, `brand.ilike.%${w}%`]);
                  const { data: similar } = await supabase
                    .from('vehicles')
                    .select('brand, model, year_model, sale_price, color')
                    .eq('status', 'disponivel')
                    .or(orClauses.join(','))
                    .limit(4);

                  if (similar && similar.length > 0) {
                    similarVehicles = similar.map((v: any) =>
                      `  - ${v.brand} ${v.model} ${v.year_model} ${v.color || ''} - R$ ${v.sale_price?.toLocaleString('pt-BR') || 'Consulte'}`
                    ).join('\n');
                  }
                }
              } catch (stockErr) {
                console.error('[ai-agent-chat] Error fetching similar:', stockErr);
              }

              // 3. Calculate conversation duration
              let duration = '';
              if (firstMsgTime) {
                const mins = Math.round((Date.now() - new Date(firstMsgTime).getTime()) / 60000);
                if (mins < 60) duration = `${mins} min`;
                else duration = `${Math.floor(mins / 60)}h ${mins % 60}min`;
              }

              // 4. Build the FICHA message
              const fichaLines: string[] = [
                `━━━━━━━━━━━━━━━━━━━━━`,
                `*LEAD QUALIFICADO PELA IA*`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                ``,
                `*Cliente:* ${lead.name || 'Nao informado'}`,
                `*WhatsApp:* wa.me/${lead.phone.replace(/\D/g, '')}`,
                `*Origem:* Instagram`,
                ``,
                `━━ *INTERESSE* ━━`,
                `*Veiculo:* ${args.vehicle_interest}`,
                `*Pagamento:* ${args.payment_method}`,
              ];

              if (args.has_trade_in) {
                fichaLines.push(`*Troca:* ${args.trade_in_details || 'Sim (sem detalhes)'}`);
              } else {
                fichaLines.push(`*Troca:* Nao`);
              }

              if (args.budget_range) {
                fichaLines.push(`*Orcamento:* ${args.budget_range}`);
              }

              if (conversationSummary) {
                fichaLines.push(``);
                fichaLines.push(`━━ *INSIGHTS DA IA* ━━`);
                fichaLines.push(conversationSummary);
              }

              if (similarVehicles) {
                fichaLines.push(``);
                fichaLines.push(`━━ *ESTOQUE SIMILAR* ━━`);
                fichaLines.push(similarVehicles);
              }

              fichaLines.push(``);
              fichaLines.push(`━━━━━━━━━━━━━━━━━━━━━`);
              if (duration) fichaLines.push(`Tempo de atendimento IA: ${duration} | ${messageCount} msgs do cliente`);
              fichaLines.push(`Toque no link pra iniciar o atendimento`);

              const fichaText = fichaLines.join('\n');
              const salespersonJid = salesperson.phone.replace(/\D/g, '') + '@s.whatsapp.net';

              console.log('[ai-agent-chat] Sending enhanced ficha to salesperson:', salespersonName);

              await fetch(`${wpInstance.api_url}message/sendText/${wpInstance.instance_name}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': wpInstance.api_key,
                },
                body: JSON.stringify({
                  number: salespersonJid,
                  text: fichaText,
                }),
              });

              console.log('[ai-agent-chat] Ficha sent successfully to', salespersonName);
            } else {
              console.warn('[ai-agent-chat] No connected WhatsApp instance to send ficha');
            }
          } catch (fichaError) {
            console.error('[ai-agent-chat] Error sending ficha via WhatsApp:', fichaError);
          }
        } else {
          console.warn('[ai-agent-chat] Salesperson has no phone number, skipping WhatsApp ficha');
        }

        return {
          success: true, qualified: true, salesperson_name: salespersonName,
          message: `QUALIFICACAO ENVIADA. NAO chame esta funcao novamente. O vendedor ${salespersonName} foi designado.`,
          handoff_message: `Perfeito, ja registrei suas informacoes. O ${salespersonName} vai entrar em contato com voce em breve.`,
        };
      }

      return {
        success: true, qualified: true,
        message: 'QUALIFICACAO ENVIADA. NAO chame esta funcao novamente.',
        handoff_message: 'Registrei suas informacoes. Um consultor vai entrar em contato em breve.',
      };
    }

    case 'mark_lead_lost': {
      if (!customerPhone) return { success: false, error: 'Phone not available' };

      const { data: lostLead } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lostLead) return { success: false, error: 'Lead nao encontrado' };

      await supabase.from('leads').update({ status: 'perdido', updated_at: new Date().toISOString() }).eq('id', lostLead.id);

      const { data: lostNeg } = await supabase
        .from('negotiations')
        .select('id')
        .eq('lead_id', lostLead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lostNeg) {
        await supabase.from('negotiations').update({
          status: 'perdido',
          loss_reason: args.loss_notes || args.loss_reason,
          updated_at: new Date().toISOString(),
        }).eq('id', lostNeg.id);
      }

      console.log('[ai-agent-chat] Lead marked as lost:', lostLead.id, 'reason:', args.loss_reason);
      return { success: true, message: 'Lead marcado como perdido. Despeca-se educadamente.' };
    }

    default:
      return { error: `Ferramenta desconhecida: ${functionName}` };
  }
}

// =============================================
// ENFORCE RESPONSE LIMITS (from Roma)
// =============================================
function enforceResponseLimits(text: string, maxChars: number = 600, maxBlocks: number = 3): string {
  let processed = text.trim();

  // FORCE split if no ||| present
  if (!processed.includes('|||') && processed.length > 40) {
    let splitIndex = -1;
    const searchEnd = Math.min(processed.length, 200);
    for (let i = 40; i < searchEnd; i++) {
      if (processed[i] === '.' || processed[i] === '?' || processed[i] === '!') {
        splitIndex = i;
        break;
      }
    }
    if (splitIndex > 0) {
      processed = processed.substring(0, splitIndex + 1) + '|||' + processed.substring(splitIndex + 1).trim();
    } else {
      const mid = Math.floor(processed.length / 2);
      let bestSpace = -1;
      for (let offset = 0; offset < mid; offset++) {
        if (mid + offset < processed.length && processed[mid + offset] === ' ') { bestSpace = mid + offset; break; }
        if (mid - offset > 0 && processed[mid - offset] === ' ') { bestSpace = mid - offset; break; }
      }
      if (bestSpace > 0) {
        processed = processed.substring(0, bestSpace) + '|||' + processed.substring(bestSpace + 1).trim();
      }
    }
  }

  let blocks = processed.split('|||').map(b => b.trim()).filter(b => b.length > 0);
  if (blocks.length === 0) blocks = [processed];
  if (blocks.length > maxBlocks) blocks = blocks.slice(0, maxBlocks);

  blocks = blocks.map(block => {
    if (block.length > maxChars) {
      const cut = block.substring(0, maxChars);
      const lastPeriod = cut.lastIndexOf('.');
      const lastQuestion = cut.lastIndexOf('?');
      const lastExcl = cut.lastIndexOf('!');
      const cutPoint = Math.max(lastPeriod, lastQuestion, lastExcl);
      if (cutPoint > maxChars * 0.3) return cut.substring(0, cutPoint + 1).trim();
      return cut.trim();
    }
    return block;
  });

  // Remove emojis
  blocks = blocks.map(b => b.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim());
  blocks = blocks.filter(b => b.length > 0);

  return blocks.join('|||');
}
