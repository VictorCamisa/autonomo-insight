import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  lead_id: string | null;
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

    const { conversation_id, lead_id, sync_all = false } = await req.json();

    console.log('[sync-embeddings] Starting sync', { conversation_id, lead_id, sync_all });

    // Buscar mensagens que ainda não têm embeddings
    let messagesQuery = supabase
      .from('ai_agent_messages')
      .select(`
        id,
        conversation_id,
        role,
        content,
        created_at
      `)
      .not('content', 'is', null)
      .order('created_at', { ascending: true });

    if (conversation_id) {
      messagesQuery = messagesQuery.eq('conversation_id', conversation_id);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('[sync-embeddings] Error fetching messages:', messagesError);
      throw messagesError;
    }

    if (!messages || messages.length === 0) {
      console.log('[sync-embeddings] No messages to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar quais mensagens já têm embeddings
    const messageIds = messages.map((m: Message) => m.id);
    const { data: existingEmbeddings } = await supabase
      .from('conversation_embeddings')
      .select('message_id')
      .in('message_id', messageIds);

    const existingIds = new Set((existingEmbeddings || []).map((e: { message_id: string }) => e.message_id));
    const newMessages = messages.filter((m: Message) => !existingIds.has(m.id));

    if (newMessages.length === 0) {
      console.log('[sync-embeddings] All messages already have embeddings');
      return new Response(
        JSON.stringify({ success: true, processed: 0, skipped: messages.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-embeddings] Processing ${newMessages.length} new messages`);

    // Buscar dados das conversas para obter lead_id
    const conversationIds = [...new Set(newMessages.map((m: Message) => m.conversation_id))];
    const { data: conversations } = await supabase
      .from('ai_agent_conversations')
      .select('id, lead_id')
      .in('id', conversationIds);

    const conversationMap = new Map((conversations || []).map((c: Conversation) => [c.id, c.lead_id]));

    // Gerar embeddings em batch
    const embeddings: { message: Message; embedding: number[] }[] = [];

    for (const message of newMessages) {
      if (!message.content || message.content.trim().length < 10) {
        console.log(`[sync-embeddings] Skipping short message ${message.id}`);
        continue;
      }

      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: message.content.substring(0, 8000), // Limitar tamanho
            model: 'text-embedding-ada-002',
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`[sync-embeddings] OpenAI error for message ${message.id}:`, errorText);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        embeddings.push({ message, embedding });

        // Rate limiting - 3 requests per second
        await new Promise(resolve => setTimeout(resolve, 350));

      } catch (error) {
        console.error(`[sync-embeddings] Error processing message ${message.id}:`, error);
      }
    }

    console.log(`[sync-embeddings] Generated ${embeddings.length} embeddings`);

    // Inserir embeddings no banco
    if (embeddings.length > 0) {
      const insertData = embeddings.map(({ message, embedding }) => ({
        message_id: message.id,
        conversation_id: message.conversation_id,
        lead_id: conversationMap.get(message.conversation_id) || lead_id || null,
        content: message.content,
        role: message.role,
        embedding: `[${embedding.join(',')}]`,
        metadata: {
          created_at: message.created_at,
          content_length: message.content.length,
        },
      }));

      const { error: insertError } = await supabase
        .from('conversation_embeddings')
        .insert(insertData);

      if (insertError) {
        console.error('[sync-embeddings] Error inserting embeddings:', insertError);
        throw insertError;
      }

      console.log(`[sync-embeddings] Successfully inserted ${insertData.length} embeddings`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: embeddings.length,
        skipped: newMessages.length - embeddings.length,
        total_messages: messages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-embeddings] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
