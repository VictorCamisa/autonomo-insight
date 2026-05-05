import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// TOOL DEFINITIONS (Anthropic format)
// =============================================
const toolDefinitions = [
  {
    name: "search_vehicles",
    description: "Busca veiculos disponiveis no estoque da loja. Use SEMPRE que o cliente perguntar sobre qualquer tipo de carro, marca, modelo, preco ou estoque. Para categorias como SUV, sedan, etc, use o campo 'keyword'. Se o cliente perguntar algo generico como 'o que voces tem?', use sem filtros.",
    input_schema: {
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
  {
    name: "get_vehicle_details",
    description: "Obtem detalhes completos de um veiculo especifico. Busca por ID ou modelo/marca.",
    input_schema: {
      type: "object",
      properties: {
        vehicle_id: { type: "string", description: "ID UUID do veiculo" },
        model: { type: "string", description: "Nome do modelo do veiculo" },
        brand: { type: "string", description: "Marca do veiculo" },
      },
      required: [],
    },
  },
  {
    name: "send_vehicle_photos",
    description: "Envia de 3 a 4 fotos de um veiculo para o cliente via WhatsApp. Use SOMENTE quando o cliente PEDIR EXPLICITAMENTE fotos. NAO envie fotos automaticamente. Quando o cliente pedir MAIS fotos, use start_index para continuar de onde parou.",
    input_schema: {
      type: "object",
      properties: {
        vehicle_id: { type: "string", description: "ID do veiculo para enviar as fotos." },
        caption: { type: "string", description: "Legenda curta das fotos" },
        start_index: { type: "number", description: "Indice inicial das fotos (0 = primeira leva, 4 = segunda leva). Use 0 na primeira vez." },
      },
      required: ["vehicle_id"],
    },
  },
  {
    name: "save_trade_in_photo",
    description: "Salva e associa uma foto do veiculo de troca do cliente ao seu perfil. Use quando o cliente enviar uma foto do carro que quer dar na troca. A foto ja foi salva automaticamente - esta tool ASSOCIA ao lead.",
    input_schema: {
      type: "object",
      properties: {
        photo_url: { type: "string", description: "URL da foto que foi salva (fornecida no contexto da mensagem)" },
        description: { type: "string", description: "Descricao da foto (ex: frente do carro, lateral, painel, motor)" },
      },
      required: ["photo_url"],
    },
  },
  {
    name: "schedule_visit",
    description: "Agenda uma visita do cliente a loja. Use quando o cliente quiser marcar um horario para ver um veiculo ou visitar a loja. Horario de funcionamento: Seg-Sex 9h-18h, Sab 9h-13h.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data da visita no formato YYYY-MM-DD" },
        time: { type: "string", description: "Horario preferido (ex: 10:00, 14:30)" },
        vehicle_interest: { type: "string", description: "Veiculo que o cliente quer ver" },
        notes: { type: "string", description: "Observacoes adicionais" },
      },
      required: ["date", "time"],
    },
  },
];

// Mark lead lost tool (static)
const markLeadLostTool = {
  name: "mark_lead_lost",
  description: "Marca o lead como PERDIDO quando o cliente deixa claro que nao quer comprar. Use quando o cliente disser 'nao quero', 'desisto', 'ja comprei', 'sem interesse', etc.",
  input_schema: {
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
      properties[field] = { type: prop.type, description: prop.description };
      if (requiredFields.includes(field)) required.push(field);
    }
  }

  properties.notes = { type: "string", description: "Observacoes adicionais" };

  const requiredLabels = requiredFields.map(f => QUAL_FIELD_LABELS[f] || f).join(', ');
  const optionalLabels = optionalFields.map(f => QUAL_FIELD_LABELS[f] || f).join(', ');

  let description = `Envia a ficha de qualificacao do lead. CHAME APENAS UMA VEZ por conversa. Campos OBRIGATORIOS: ${requiredLabels}.`;
  if (optionalLabels) description += ` Campos opcionais (bonus): ${optionalLabels}.`;

  return {
    name: "submit_qualification",
    description,
    input_schema: {
      type: "object",
      properties,
      required: required.length > 0 ? required : ["veiculo_interesse"],
    },
  };
}

// Tool for requesting human takeover
const requestHumanTakeoverTool = {
  name: "request_human_takeover",
  description: "Transfere o atendimento para um consultor humano e PÁRA de responder. Use SOMENTE quando o cliente pedir desconto que não pode ser dado, estiver irritado, pedir para falar com vendedor, ou nas outras condições de handoff.",
  input_schema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "O motivo da transferência (ex: 'Cliente pediu desconto', 'Cliente irritado', 'Dúvida complexa')" }
    },
    required: ["reason"]
  }
};

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
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";

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
    const today = new Date().toISOString().split('T')[0];
    const sessionId = `whatsapp_${phone || lead_id || crypto.randomUUID()}_${today}`;
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
        .order('created_at', { ascending: false }) // Busque as úmtimas N mensagens (descendente)
        .limit(contextWindowSize),
      supabase
        .from('vehicles')
        .select('brand, model, year_model, sale_price')
        .eq('status', 'disponivel')
        .order('brand', { ascending: true }),
      lead_id
        ? supabase.from('leads').select('id, name, phone, status, vehicle_interest').eq('id', lead_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from('qualification_settings')
        .select('active_level, required_fields')
        .eq('level', 'CURRENT')
        .single(),
      supabase
        .from('qualification_settings')
        .select('level, name, required_fields, optional_fields, description')
        .in('level', ['Q1', 'Q2', 'Q3'])
        .order('level', { ascending: true }),
    ]);

    // Reverse history back to chronological order (oldest first) so the AI understands the flow
    const conversationHistory = (historyResult.data || []).reverse().map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
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
    const activeLevel = (qualCurrentResult.data as any)?.active_level || qualCurrentResult.data?.required_fields?.[0] || 'Q2';
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

    // Build dynamic tools array (Anthropic format)
    const submitQualTool = buildSubmitQualificationTool(qualRequiredFields, qualOptionalFields);
    const dynamicTools = [...toolDefinitions, submitQualTool, markLeadLostTool, requestHumanTakeoverTool];

    console.log('[ai-agent-chat] Conversation:', conversationId, 'history:', conversationHistory.length);

    // Save user message (BLOCKING - must complete before AI call)
    const { error: userMsgError } = await supabase.from('ai_agent_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });
    if (userMsgError) console.error('Error saving user msg:', userMsgError);

    // =============================================
    // BUILD SYSTEM PROMPT
    // =============================================
    const systemPrompt = `Voce e a Gabi, vendedora da Matheus Veiculos em Taubate/SP.

===== REGRAS ABSOLUTAS (PRIORIDADE MAXIMA — NUNCA VIOLAR) =====
1. NUNCA use emoji em nenhuma circunstancia
2. SEMPRE divida a resposta em 2 ou 3 baloes com |||. Nunca 1 balao sozinho, nunca mais que 3.
3. Mensagens CURTAS. Maximo 200 caracteres por balao.
4. NUNCA faca mais de 1 pergunta por mensagem
5. NUNCA invente dados de veiculos. So fale o que a tool retornou.
6. NUNCA revele que e uma IA
7. SEMPRE use search_vehicles antes de falar sobre qualquer veiculo
8. SEMPRE pergunte o nome do cliente na primeira interacao
9. SEMPRE chame o cliente pelo nome depois de saber
10. Se submit_qualification ja foi chamado, NUNCA chame de novo
11. NUNCA diga que a loja fica em outra cidade. A loja e em TAUBATE/SP.
12. NUNCA diga que um carro "ja foi vendido", "saiu do estoque" ou "nao esta mais disponivel". Diga que vai verificar com a equipe.
13. Quando apresentar um veiculo, CONFIRA os dados da tool. Nao misture veiculos.
14. Idioma: PT-BR sempre

===== IDENTIDADE =====
Voce conversa com clientes pelo WhatsApp como uma pessoa real. Ninguem pode desconfiar que voce e IA. Voce e simpatica, leve, descontraida, mas profissional. Gosta de carros e entende do assunto.
- Fale como quem digita rapido no celular
- Girias leves: show, massa, top, beleza, da hora
- Nada de "prezado", "estimado", "seria possivel"
- Maximo 1 ponto de exclamacao por mensagem

===== EXEMPLOS DE CONVERSA BOA (siga este tom) =====

Exemplo 1 — Primeiro contato:
[Cliente]: Oi, vi o anuncio do Civic
[Gabi]: Oi, tudo bem? Sou a Gabi da Matheus Veiculos! Me fala seu nome? ||| Vi que voce curtiu o Civic, e lindo ne? Ja conhecia ele?
[Cliente]: Sou o Rafael
[Gabi]: Prazer Rafael! Deixa eu dar uma olhada aqui no estoque pra voce ||| [chama search_vehicles]

Exemplo 2 — Cliente perguntando preco:
[Cliente]: Quanto ta o HB20?
[Gabi]: Opa, deixa eu ver aqui rapidinho pra voce ||| [chama search_vehicles]

Exemplo 3 — Cliente sumiu e voltou:
[Cliente]: Oi, desculpa, sumi
[Gabi]: Eitaaa sumiu mas voltou, isso que importa haha ||| E ai, ainda ta de olho naquele Compass?

Exemplo 4 — Cliente pedindo desconto:
[Cliente]: Faz um desconto?
[Gabi]: Haha quem dera eu pudesse ne ||| Vou passar pro gerente dar uma olhada, ele que manda nessa parte

===== SOBRE A LOJA =====
- Matheus Veiculos — Av. Major Joaquim Monteiro Patto, 25, Chacara do Visconde - Taubate/SP, CEP 12050-620
- Aceita troca, financiamento, a vista, consorcio
- Horario: Seg-Sex 9h-18h / Sab 9h-13h

===== FLUXO DE VENDA CONSULTIVA =====
1. RAPPORT: Cumprimentar, pegar o nome, criar conexao
2. DESCOBERTA: Entender o que o cliente busca
3. APRESENTACAO: Mostrar opcoes reais do estoque (search_vehicles)
4. APROFUNDAMENTO: Coletar info para qualificacao (1 por mensagem)
5. QUALIFICACAO: Quando tiver TODOS campos obrigatorios, chamar submit_qualification UMA VEZ
6. HANDOFF: Avisar que consultor vai continuar

REGRAS: Nao pule etapas. 1 info nova por mensagem. Resposta curta do cliente = avance.

${qualPromptSection}

===== CRITERIOS DE HANDOFF PARA HUMANO =====
Transfira para humano (avise que um consultor vai assumir) quando:
- Cliente pediu desconto pela 2a vez
- Cliente mencionou financiamento e quer simular parcelas especificas
- Cliente demonstra irritacao ou insatisfacao
- Cliente quer negociar valor de troca
- Apos submit_qualification: SEMPRE avise que o consultor vai entrar em contato

===== USO DE TOOLS =====
ESTOQUE: Se o cliente mencionar QUALQUER veiculo, chame search_vehicles IMEDIATAMENTE. Nao pergunte antes.
FOTOS: Envie APENAS quando o cliente pedir. Use send_vehicle_photos com vehicle_id correto.
TROCA: Se o cliente enviar foto do carro dele, use save_trade_in_photo.
AGENDAMENTO: Confirme data/horario, use schedule_visit. Horario: Seg-Sex 9h-18h, Sab 9h-13h.
LEAD PERDIDO: Se o cliente deixar claro que nao quer, chame mark_lead_lost.

===== ESTOQUE ATUAL =====
${inventoryContext || 'Use search_vehicles para consultar.'}

===== CONTEXTO =====
${leadInfo}
${vehicleInfo}${lastVehicleContext}${sessionNote}
Interacoes nesta sessao: ${conversationHistory.length}`;

    // =============================================
    // AI API CALL WITH TOOL CALLING LOOP (ANTHROPIC)
    // =============================================
    // Convert conversation history to Anthropic format
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: any }> = [];
    
    for (const msg of conversationHistory) {
      anthropicMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }
    // Add current user message
    anthropicMessages.push({ role: 'user', content: message });

    // Ensure messages alternate (Anthropic requirement)
    const sanitizedMessages = sanitizeAnthropicMessages(anthropicMessages);

    const temperature = agent.temperature || 0.3;
    const maxTokens = agent.max_tokens || 1024;
    const MAX_ROUNDS = 5;
    let round = 0;
    let responseMessage = '';
    let photosToSend: Array<{ url: string; caption: string }> = [];
    let toolCallsLog: string[] = [];

    try {
      while (round < MAX_ROUNDS) {
        round++;
        console.log(`[ai-agent-chat] Round ${round}, messages: ${sanitizedMessages.length}`);

        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            system: systemPrompt,
            messages: sanitizedMessages,
            tools: dynamicTools,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('[ai-agent-chat] Anthropic error:', aiResponse.status, errorText);
          if (aiResponse.status === 429) throw new Error("Rate limit exceeded");
          if (aiResponse.status === 402) throw new Error("Credits exhausted");
          throw new Error(`Anthropic error: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        const stopReason = data.stop_reason;

        // Extract text and tool_use blocks
        const textBlocks = (data.content || []).filter((b: any) => b.type === 'text');
        const toolUseBlocks = (data.content || []).filter((b: any) => b.type === 'tool_use');

        if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
          // Add assistant message with tool calls
          sanitizedMessages.push({
            role: 'assistant',
            content: data.content,
          });

          // Execute each tool call and build tool_result blocks
          const toolResultBlocks: any[] = [];
          for (const toolUse of toolUseBlocks) {
            const fnName = toolUse.name;
            const fnArgs = toolUse.input || {};

            console.log(`[ai-agent-chat] Executing tool: ${fnName}`, fnArgs);
            toolCallsLog.push(fnName);

            const toolResult = await executeToolCall(supabase, fnName, fnArgs, phone, photosToSend, agent_id, activeLevel, LOVABLE_API_KEY, lead_id, conversationId);

            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult),
            });
          }

          // Add tool results as user message (Anthropic format)
          sanitizedMessages.push({
            role: 'user',
            content: toolResultBlocks,
          });

          // Continue loop to get final text
        } else {
          // No tool calls — final text response
          responseMessage = textBlocks.map((b: any) => b.text).join('') || '';
          break;
        }
      }

      // If we ran out of rounds without text, do one more call without tools
      if (!responseMessage && round >= MAX_ROUNDS) {
        console.log('[ai-agent-chat] Max rounds, getting final text...');
        const finalResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            system: systemPrompt,
            messages: sanitizedMessages,
            temperature,
            max_tokens: maxTokens,
          }),
        });
        if (finalResponse.ok) {
          const finalData = await finalResponse.json();
          const textBlocks = (finalData.content || []).filter((b: any) => b.type === 'text');
          responseMessage = textBlocks.map((b: any) => b.text).join('') || '';
        }
      }

      // Retry if empty
      if (!responseMessage || responseMessage.trim().length === 0) {
        console.warn('[ai-agent-chat] Empty response, retrying with nudge...');
        sanitizedMessages.push({ role: 'user', content: 'IMPORTANTE: O cliente esta esperando uma resposta. Responda com texto em portugues.' });
        const retryResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            system: systemPrompt,
            messages: sanitizedMessages,
            temperature,
            max_tokens: maxTokens,
          }),
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const textBlocks = (retryData.content || []).filter((b: any) => b.type === 'text');
          responseMessage = textBlocks.map((b: any) => b.text).join('') || '';
        }
        if (!responseMessage) responseMessage = 'Oi! Me conta o que voce esta procurando que eu busco aqui no estoque.';
      }

    } catch (aiError) {
      console.error('[ai-agent-chat] AI error:', aiError);
      responseMessage = 'Oi! Estou aqui para te ajudar. Me conta o que voce esta procurando.';
    }

    // =============================================
    // ENFORCE RESPONSE LIMITS
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
// SANITIZE MESSAGES FOR ANTHROPIC (must alternate user/assistant)
// =============================================
function sanitizeAnthropicMessages(messages: Array<{ role: 'user' | 'assistant'; content: any }>): Array<{ role: 'user' | 'assistant'; content: any }> {
  if (messages.length === 0) return messages;
  
  const result: Array<{ role: 'user' | 'assistant'; content: any }> = [];
  
  for (const msg of messages) {
    if (result.length === 0) {
      // First message must be user
      if (msg.role === 'assistant') {
        result.push({ role: 'user', content: '[inicio da conversa]' });
      }
      result.push(msg);
    } else {
      const lastRole = result[result.length - 1].role;
      if (msg.role === lastRole) {
        // Same role consecutive - merge content
        const last = result[result.length - 1];
        if (typeof last.content === 'string' && typeof msg.content === 'string') {
          last.content = last.content + '\n' + msg.content;
        } else {
          // For complex content (tool results), add separator
          result.push({ role: msg.role === 'user' ? 'assistant' : 'user', content: '[continuacao]' });
          result.push(msg);
        }
      } else {
        result.push(msg);
      }
    }
  }
  
  // Ensure last message is user
  if (result.length > 0 && result[result.length - 1].role !== 'user') {
    // This shouldn't happen since we add the user message last, but safety check
  }
  
  return result;
}

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
  qualificationLevel?: string,
  lovableApiKey?: string,
  leadId?: string,
  conversationId?: string,
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
          query = query.or(modelVariants.map((v: string) => `model.ilike.%${v}%`).join(','));
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
          query = query.or(mappedModels.map((m: string) => `model.ilike.%${m}%`).join(','));
        } else {
          const kwVariants = generateVariants(args.keyword);
          const orParts = kwVariants.flatMap((v: string) => [
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

      // FALLBACK: AI often hallucinates UUIDs
      if (!vehicle) {
        console.log('[send_vehicle_photos] Vehicle ID not found, trying fallback search by caption:', args.caption);
        const searchTerm = args.caption || args.vehicle_id || '';
        const words = searchTerm.split(/[\s,]+/).filter((w: string) => w.length >= 3);
        
        if (words.length > 0) {
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

      let photoUrls: string[] = [];
      
      const { data: categorizedPhotos } = await supabase
        .from('vehicle_images')
        .select('image_url')
        .eq('vehicle_id', vehicle.id)
        .order('created_at', { ascending: true });
      
      if (categorizedPhotos && categorizedPhotos.length > 0) {
        photoUrls = categorizedPhotos.map((p: any) => p.image_url).filter(Boolean);
      }
      
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

    case 'save_trade_in_photo': {
      if (!customerPhone) return { success: false, error: 'Phone not available' };

      const resolvedLeadId = leadId || await findLeadByPhone(supabase, customerPhone);
      if (!resolvedLeadId) return { success: false, error: 'Lead nao encontrado' };

      // Save trade-in photo reference to lead's qualification_data
      const { data: lead } = await supabase.from('leads').select('qualification_data').eq('id', resolvedLeadId).single();
      const qualData = lead?.qualification_data || {};
      const tradeInPhotos = qualData.trade_in_photos || [];
      tradeInPhotos.push({
        url: args.photo_url,
        description: args.description || 'Foto do veiculo de troca',
        saved_at: new Date().toISOString(),
      });
      qualData.trade_in_photos = tradeInPhotos;

      await supabase.from('leads').update({
        qualification_data: qualData,
        updated_at: new Date().toISOString(),
      }).eq('id', resolvedLeadId);

      console.log('[save_trade_in_photo] Saved photo for lead:', resolvedLeadId, 'total:', tradeInPhotos.length);
      return {
        success: true,
        total_photos: tradeInPhotos.length,
        message: `Foto salva com sucesso. Total de fotos do veiculo de troca: ${tradeInPhotos.length}`,
      };
    }

    case 'schedule_visit': {
      if (!customerPhone) return { success: false, error: 'Phone not available' };

      const resolvedLeadId2 = leadId || await findLeadByPhone(supabase, customerPhone);
      if (!resolvedLeadId2) return { success: false, error: 'Lead nao encontrado' };

      // Validate date/time
      const visitDate = args.date;
      const visitTime = args.time;
      
      // Check if within business hours
      const dateObj = new Date(`${visitDate}T${visitTime}:00`);
      const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
      const hour = parseInt(visitTime.split(':')[0]);
      
      if (dayOfWeek === 0) {
        return { success: false, error: 'A loja nao abre aos domingos. Horario: Seg-Sex 9h-18h, Sab 9h-13h.' };
      }
      if (dayOfWeek === 6 && (hour < 9 || hour >= 13)) {
        return { success: false, error: 'Aos sabados o horario e das 9h as 13h.' };
      }
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && (hour < 9 || hour >= 18)) {
        return { success: false, error: 'O horario de funcionamento e das 9h as 18h (Seg-Sex).' };
      }

      // Save visit as lead interaction
      await supabase.from('lead_interactions').insert({
        lead_id: resolvedLeadId2,
        type: 'visit_scheduled',
        description: `Visita agendada: ${visitDate} as ${visitTime}${args.vehicle_interest ? ` - ${args.vehicle_interest}` : ''}${args.notes ? ` | ${args.notes}` : ''}`,
      });

      // Update lead notes
      const { data: leadForVisit } = await supabase.from('leads').select('notes, assigned_to, name').eq('id', resolvedLeadId2).single();
      const existingNotes = leadForVisit?.notes || '';
      await supabase.from('leads').update({
        notes: `${existingNotes}\n[VISITA AGENDADA] ${visitDate} as ${visitTime}${args.vehicle_interest ? ` - ${args.vehicle_interest}` : ''}`.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', resolvedLeadId2);

      // Notify assigned salesperson
      if (leadForVisit?.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: leadForVisit.assigned_to,
          type: 'visit_scheduled',
          title: 'Visita Agendada pela IA',
          message: `${leadForVisit.name || 'Lead'} agendou visita: ${visitDate} as ${visitTime}${args.vehicle_interest ? ` - ${args.vehicle_interest}` : ''}`,
          link: '/crm',
        });

        // Send WhatsApp to salesperson
        try {
          const { data: salesperson } = await supabase.from('profiles').select('phone, full_name').eq('id', leadForVisit.assigned_to).single();
          if (salesperson?.phone) {
            const { data: wpInstances } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name, api_url, api_key')
              .eq('status', 'connected')
              .order('is_shared', { ascending: false })
              .limit(1);

            const wpInstance = wpInstances?.[0];
            if (wpInstance) {
              const apiUrl = (wpInstance.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '') + '/';
              const apiKey = wpInstance.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';
              if (!apiUrl || !apiKey) { console.warn('[schedule_visit] No api_url/api_key available'); }
              else {
                const visitMsg = `*VISITA AGENDADA*\n\nCliente: ${leadForVisit.name || 'Lead'}\nData: ${visitDate}\nHorario: ${visitTime}${args.vehicle_interest ? `\nVeiculo: ${args.vehicle_interest}` : ''}${args.notes ? `\nObs: ${args.notes}` : ''}\n\nAgendado pela IA Gabi`;
                const salespersonJid = salesperson.phone.replace(/\D/g, '') + '@s.whatsapp.net';

                await fetch(`${apiUrl}message/sendText/${wpInstance.instance_name}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ number: salespersonJid, text: visitMsg }),
                });
              }
            }
          }
        } catch (e) {
          console.error('[schedule_visit] Error notifying salesperson:', e);
        }
      }

      return {
        success: true,
        message: `Visita agendada para ${visitDate} as ${visitTime}. O vendedor foi notificado.`,
      };
    }

    case 'submit_qualification': {
      if (!customerPhone && !leadId) return { success: false, error: 'Phone and leadId not available' };

      let lead = null;
      if (leadId) {
        const { data } = await supabase.from('leads').select('id, name, phone, qualification_data').eq('id', leadId).single();
        lead = data;
      }
      if (!lead && customerPhone) {
        const { data } = await supabase.from('leads').select('id, name, phone, qualification_data').eq('phone', customerPhone).order('created_at', { ascending: false }).limit(1).single();
        lead = data;
      }

      if (!lead) return { success: false, error: 'Lead nao encontrado' };

      // Build qualification_data with ALL collected info (dynamic fields)
      const existingQualData = lead.qualification_data || {};
      const qualificationData: Record<string, any> = { ...existingQualData };
      for (const [key, val] of Object.entries(args)) {
        if (val !== undefined && val !== null && val !== '') {
          qualificationData[key] = val;
        }
      }
      qualificationData.qualified_at = new Date().toISOString();
      qualificationData.qualified_by = 'ai_agent';
      qualificationData.qualification_level = qualificationLevel || 'Q2';

      const vehicleInterest = args.veiculo_interesse || args.vehicle_interest || '';
      const paymentMethod = args.forma_pagamento || args.payment_method || '';
      const hasTrade = args.tem_troca || args.has_trade_in || false;
      const tradeDetails = args.veiculo_troca || args.trade_in_details || '';

      const leadUpdate: Record<string, any> = {
        qualification_data: qualificationData,
        qualification_level: qualificationLevel || 'Q2',
        status: 'qualificado',
        updated_at: new Date().toISOString(),
      };
      if (vehicleInterest) leadUpdate.vehicle_interest = vehicleInterest;
      await supabase.from('leads').update(leadUpdate).eq('id', lead.id);

      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('id')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (negotiation) {
        const noteParts = [`Qualificado pela IA (${qualificationLevel || 'Q2'})`];
        if (vehicleInterest) noteParts.push(`Veiculo: ${vehicleInterest}`);
        if (paymentMethod) noteParts.push(`Pagamento: ${paymentMethod}`);
        if (hasTrade) noteParts.push(`Troca: ${tradeDetails || 'Sim'}`);
        
        await supabase.from('negotiations').update({
          status: 'negociando',
          qualification_level: qualificationLevel || 'Q2',
          notes: noteParts.join(' | '),
          updated_at: new Date().toISOString(),
        }).eq('id', negotiation.id);
      }

      // Check if lead already has an assigned salesperson (avoid double round-robin)
      const { data: currentLead } = await supabase.from('leads').select('assigned_to').eq('id', lead.id).single();
      let assignedSalesperson = currentLead?.assigned_to;

      if (!assignedSalesperson) {
        const { data: nextSalesperson } = await supabase.rpc('get_next_round_robin_salesperson');
        if (nextSalesperson) {
          assignedSalesperson = nextSalesperson;
          await supabase.from('leads').update({ assigned_to: nextSalesperson, updated_at: new Date().toISOString() }).eq('id', lead.id);
          if (negotiation) {
            await supabase.from('negotiations').update({ salesperson_id: nextSalesperson }).eq('id', negotiation.id);
          }
          await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: nextSalesperson });
        }
      } else {
        // Ensure negotiation has the salesperson
        if (negotiation) {
          await supabase.from('negotiations').update({ salesperson_id: assignedSalesperson }).eq('id', negotiation.id);
        }
      }

      if (assignedSalesperson) {

        const { data: salesperson } = await supabase.from('profiles').select('full_name, phone').eq('id', assignedSalesperson).single();
        const salespersonName = salesperson?.full_name || 'nosso consultor';

        await supabase.from('notifications').insert({
          user_id: assignedSalesperson,
          type: 'lead_assigned',
          title: 'Novo Lead Qualificado pela IA',
          message: `Lead qualificado (${qualificationLevel}): ${vehicleInterest || 'N/A'}${paymentMethod ? ' | Pagamento: ' + paymentMethod : ''}`,
          link: '/crm',
        });

        // ===== SEND FICHA COMPLETA VIA WHATSAPP TO SALESPERSON =====
        if (salesperson?.phone) {
          try {
            const { data: wpInstances } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name, api_url, api_key')
              .eq('status', 'connected')
              .order('is_shared', { ascending: false })
              .order('is_default', { ascending: false })
              .limit(1);

            const wpInstance = wpInstances?.[0];
            if (wpInstance) {
              const apiUrl = (wpInstance.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '') + '/';
              const apiKey = wpInstance.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';
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
                    
                    // Use Lovable AI Gateway for summary (cheaper/faster)
                    if (lovableApiKey) {
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
                          Authorization: `Bearer ${lovableApiKey}`,
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
                }
              } catch (summaryErr) {
                console.error('[ai-agent-chat] Error generating summary:', summaryErr);
              }

              let similarVehicles = '';
              try {
                const searchTerms = (vehicleInterest || '').split(/\s+/).filter((w: string) => w.length >= 3);
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

              let duration = '';
              if (firstMsgTime) {
                const mins = Math.round((Date.now() - new Date(firstMsgTime).getTime()) / 60000);
                if (mins < 60) duration = `${mins} min`;
                else duration = `${Math.floor(mins / 60)}h ${mins % 60}min`;
              }

              const fichaLines: string[] = [
                `━━━━━━━━━━━━━━━━━━━━━`,
                `*LEAD QUALIFICADO PELA IA (${qualificationLevel || 'Q2'})*`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                ``,
                `*Cliente:* ${lead.name || args.nome || 'Nao informado'}`,
                `*WhatsApp:* wa.me/${lead.phone.replace(/\D/g, '')}`,
              ];

              if (args.origem) fichaLines.push(`*Origem:* ${args.origem}`);
              fichaLines.push(``);
              fichaLines.push(`━━ *DADOS COLETADOS* ━━`);
              
              const fieldDisplayOrder = ['veiculo_interesse', 'forma_pagamento', 'orcamento', 'entrada', 'parcela', 'tem_troca', 'veiculo_troca', 'cpf', 'nome_limpo', 'profissao', 'renda'];
              for (const field of fieldDisplayOrder) {
                const val = args[field];
                if (val !== undefined && val !== null && val !== '') {
                  const label = QUAL_FIELD_LABELS[field] || field;
                  if (typeof val === 'boolean') {
                    fichaLines.push(`*${label}:* ${val ? 'Sim' : 'Nao'}`);
                  } else {
                    fichaLines.push(`*${label}:* ${val}`);
                  }
                }
              }
              if (!args.veiculo_interesse && args.vehicle_interest) fichaLines.push(`*Veiculo:* ${args.vehicle_interest}`);
              if (!args.forma_pagamento && args.payment_method) fichaLines.push(`*Pagamento:* ${args.payment_method}`);
              if (args.notes) fichaLines.push(`*Obs:* ${args.notes}`);

              // Include trade-in photos in ficha
              const tradeInPhotos = qualificationData.trade_in_photos || [];
              if (tradeInPhotos.length > 0) {
                fichaLines.push(``);
                fichaLines.push(`━━ *FOTOS DO VEICULO DE TROCA* ━━`);
                fichaLines.push(`${tradeInPhotos.length} foto(s) recebida(s)`);
                for (const photo of tradeInPhotos) {
                  fichaLines.push(`  - ${photo.description}: ${photo.url}`);
                }
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

              await fetch(`${apiUrl}message/sendText/${wpInstance.instance_name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: salespersonJid, text: fichaText }),
              });

              // Send trade-in photos as images to salesperson
              if (tradeInPhotos.length > 0) {
                for (const photo of tradeInPhotos.slice(0, 5)) {
                  await fetch(`${apiUrl}message/sendMedia/${wpInstance.instance_name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({
                      number: salespersonJid,
                      mediatype: 'image',
                      media: photo.url,
                      caption: `Troca - ${photo.description || 'Foto do veiculo'}`,
                    }),
                  });
                  await new Promise(r => setTimeout(r, 800));
                }
              }

              console.log('[ai-agent-chat] Ficha sent successfully to', salespersonName);
            }
          } catch (fichaError) {
            console.error('[ai-agent-chat] Error sending ficha via WhatsApp:', fichaError);
          }
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
      if (!customerPhone && !leadId) return { success: false, error: 'Phone and leadId not available' };

      let lostLead = null;
      if (leadId) {
        const { data } = await supabase.from('leads').select('id, name, assigned_to').eq('id', leadId).single();
        lostLead = data;
      }
      if (!lostLead && customerPhone) {
        const { data } = await supabase.from('leads').select('id, name, assigned_to').eq('phone', customerPhone).order('created_at', { ascending: false }).limit(1).single();
        lostLead = data;
      }

      if (!lostLead) return { success: false, error: 'Lead nao encontrado' };

      await supabase.from('leads').update({ status: 'perdido', updated_at: new Date().toISOString() }).eq('id', lostLead.id);

      const { data: lostNeg } = await supabase
        .from('negotiations')
        .select('id, salesperson_id')
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

      // ===== NOTIFY SALESPERSON VIA WHATSAPP ABOUT LOST LEAD =====
      const salespersonId = lostNeg?.salesperson_id || lostLead.assigned_to;
      if (salespersonId) {
        try {
          const { data: salesperson } = await supabase.from('profiles').select('phone, full_name').eq('id', salespersonId).single();

          // In-app notification
          await supabase.from('notifications').insert({
            user_id: salespersonId,
            type: 'lead_lost',
            title: 'Lead Perdido',
            message: `${lostLead.name || 'Lead'} foi marcado como perdido pela IA. Motivo: ${args.loss_reason || 'Nao informado'}`,
            link: '/crm',
          });

          // WhatsApp notification
          if (salesperson?.phone) {
            const { data: wpInstances } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name, api_url, api_key')
              .eq('status', 'connected')
              .order('is_shared', { ascending: false })
              .limit(1);

            const wpInstance = wpInstances?.[0];
            if (wpInstance) {
              const apiUrl = (wpInstance.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '') + '/';
              const apiKey = wpInstance.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';
              if (apiUrl && apiKey) {
                const lossReasonLabels: Record<string, string> = {
                  sem_entrada: 'Sem entrada',
                  sem_credito: 'Sem credito',
                  curioso: 'Apenas curioso',
                  caro: 'Achou caro',
                  comprou_outro: 'Comprou em outro lugar',
                  desistiu: 'Desistiu da compra',
                  sem_contato: 'Sem contato',
                  outros: 'Outros',
                };

                const lostMsg = `*LEAD PERDIDO*\n\nCliente: ${lostLead.name || 'Lead'}\nWhatsApp: wa.me/${(customerPhone || lostLead.phone || '').replace(/\D/g, '')}\nMotivo: ${lossReasonLabels[args.loss_reason] || args.loss_reason}\n${args.loss_notes ? `Detalhes: ${args.loss_notes}\n` : ''}\nRegistrado pela IA Gabi`;
                const salespersonJid = salesperson.phone.replace(/\D/g, '') + '@s.whatsapp.net';

                await fetch(`${apiUrl}message/sendText/${wpInstance.instance_name}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ number: salespersonJid, text: lostMsg }),
                });
                console.log('[mark_lead_lost] WhatsApp notification sent to salesperson');
              }
            }
          }
        } catch (notifyErr) {
          console.error('[mark_lead_lost] Error notifying salesperson:', notifyErr);
        }
      }

      console.log('[ai-agent-chat] Lead marked as lost:', lostLead.id, 'reason:', args.loss_reason);
      return { success: true, message: 'Lead marcado como perdido. Despeca-se educadamente.' };
    }

    case 'request_human_takeover': {
      if (!conversationId) return { success: false, error: 'Conversation ID not available' };
      
      const reason = args.reason || 'Solicitado pela IA';
      
      // Bloquear na tabela ai_agent_human_takeover
      await supabase.from('ai_agent_human_takeover').insert({
        conversation_id: conversationId,
        reason: reason,
      });
      
      // Atualizar o status do Lead (se houver) e enviar notif ao vendedor
      if (leadId || customerPhone) {
        let handoffLead = null;
        if (leadId) {
          const { data } = await supabase.from('leads').select('id, name, assigned_to').eq('id', leadId).single();
          handoffLead = data;
        }
        if (!handoffLead && customerPhone) {
          const { data } = await supabase.from('leads').select('id, name, assigned_to').eq('phone', customerPhone).order('created_at', { ascending: false }).limit(1).single();
          handoffLead = data;
        }

        if (handoffLead?.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: handoffLead.assigned_to,
            type: 'human_takeover',
            title: 'Atendimento Transferido pela IA',
            message: `A IA encerrou o atendimento de ${handoffLead.name || 'Lead'}. Motivo: ${reason}`,
            link: '/crm',
          });
        }
      }
      
      console.log('[ai-agent-chat] Human takeover requested for conversation:', conversationId, 'reason:', reason);
      return { 
        success: true, 
        message: 'A transferência foi registrada com sucesso. VOCÊ AGORA DEVE AVISAR O CLIENTE QUE UM ATENDENTE VAI CONTINUAR E ENCERRAR A MENSAGEM.'
      };
    }

    default:
      return { error: `Ferramenta desconhecida: ${functionName}` };
  }
}

// =============================================
// HELPER: Find lead by phone
// =============================================
async function findLeadByPhone(supabase: any, phone: string): Promise<string | null> {
  const phoneNoCountry = phone.replace(/^55/, '');
  const candidates = [phone, phoneNoCountry, `+${phone}`, `+${phoneNoCountry}`];
  for (const c of candidates) {
    const { data } = await supabase.from('leads').select('id').eq('phone', c).limit(1).maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

// =============================================
// ENFORCE RESPONSE LIMITS
// =============================================
function enforceResponseLimits(text: string, maxChars: number = 600, maxBlocks: number = 3): string {
  let processed = text.trim();

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
