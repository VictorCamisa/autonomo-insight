import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { agent_id, message, session_id, conversation_id } = body;

    console.log('[ai-agent-chat] Request:', { agent_id, message: message?.substring(0, 50) });

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
      console.error('[ai-agent-chat] Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ai-agent-chat] Agent found:', agent.name);

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
    const systemPrompt = agent.system_prompt || 'Você é um assistente virtual útil para a loja Matheus Veículos.';
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Save user message
    await supabase.from('ai_agent_messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message,
    });

    // Determine which API to use
    let aiResponse: string;
    
    // Try OpenAI first if configured
    if (openaiApiKey && agent.llm_provider === 'openai') {
      console.log('[ai-agent-chat] Using OpenAI API');
      aiResponse = await callOpenAI(openaiApiKey, agent.llm_model || 'gpt-4o-mini', messages);
    } 
    // Fallback to Lovable AI Gateway
    else if (lovableApiKey) {
      console.log('[ai-agent-chat] Using Lovable AI Gateway');
      aiResponse = await callLovableAI(lovableApiKey, messages);
    } 
    else {
      throw new Error('No AI API key configured');
    }

    console.log('[ai-agent-chat] AI Response received, length:', aiResponse.length);

    // Save assistant message
    await supabase.from('ai_agent_messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: aiResponse,
    });

    return new Response(
      JSON.stringify({
        response: aiResponse,
        conversation_id: currentConversationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-agent-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Call OpenAI API directly
async function callOpenAI(apiKey: string, model: string, messages: any[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sem resposta';
}

// Call Lovable AI Gateway
async function callLovableAI(apiKey: string, messages: any[]): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[LovableAI] Error:', error);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sem resposta';
}
