import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('WhatsApp Webhook received:', JSON.stringify(payload, null, 2));

    const { event, data, instance } = payload;

    const normalizeEvent = (e?: string) =>
      (e || '')
        .toLowerCase()
        .replace(/_/g, '.'); // e.g. MESSAGES_UPSERT -> messages.upsert

    const normalizedEvent = normalizeEvent(event);

    // Handle different event types from Evolution API
    switch (normalizedEvent) {
      case 'messages.upsert':
        await handleNewMessage(supabase, data, instance, payload);
        break;
      case 'messages.update':
        await handleMessageUpdate(supabase, data);
        break;
      case 'connection.update':
        await handleConnectionUpdate(supabase, data, instance);
        break;
      case 'qrcode.updated':
        await handleQRCodeUpdate(supabase, data, instance);
        break;
      default:
        console.log('Unhandled event type:', event, 'normalized:', normalizedEvent);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleNewMessage(supabase: any, data: any, instanceName: string, payload: any) {
  // Evolution API v2 sends message info inside data (or at the root level, depending on event structure)
  const message = data;
  const remoteJid = message.key?.remoteJid;
  const fromMe = message.key?.fromMe;
  
  // Extract audio URL - check multiple possible locations
  const audioMessage = message.message?.audioMessage;
  const audioUrl = audioMessage?.url || 
                   audioMessage?.directPath || 
                   message.message?.pttMessage?.url ||
                   null;
  
  // Check if it's an audio message
  const isAudio = !!(audioMessage || message.message?.pttMessage);
  
  const content =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    (isAudio ? '[Áudio]' : '[Mídia]');
  const pushName = message.pushName;
  const messageId = message.key?.id;

  const { phone, remoteJidToStore } = extractPhoneAndJid(message, payload);

  console.log('Processing message:', {
    remoteJid,
    remoteJidToStore,
    fromMe,
    phone,
    pushName,
    content: content?.substring(0, 50),
    messageId,
    isAudio,
    hasAudioUrl: !!audioUrl,
    audioMessage: audioMessage ? 'present' : 'none',
  });

  // Skip outgoing messages for lead creation
  if (fromMe) {
    await processOutgoingMessage(supabase, message, instanceName, phone, remoteJidToStore, content, messageId);
    return;
  }

  // ===== INCOMING MESSAGE: Process lead and contact =====
  
  // Find or create lead by phone
  let leadId: string | null = null;
  let contact: { id: string; lead_id?: string; unread_count?: number; phone?: string } | null = null;

  if (phone) {
    // Try to find existing lead
    leadId = await findLeadIdByPhone(supabase, phone);

    if (!leadId) {
      // Create new lead with Round Robin assignment
      console.log('Creating new lead for phone:', phone, 'name:', pushName);
      leadId = await createLeadWithRoundRobin(supabase, phone, pushName || 'WhatsApp');
      console.log('Created lead:', leadId);
    } else {
      // Update existing lead's last contact
      console.log('Updating existing lead:', leadId);
      await supabase
        .from('leads')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    // Find contact by phone
    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('id, lead_id, unread_count, phone')
      .eq('phone', phone)
      .single();
    
    contact = existingContact;
  }

  // If no contact found by phone but we have a lead, try to find existing contact by lead_id
  if (!contact && leadId) {
    contact = await findContactByLeadId(supabase, leadId);
  }

  // If still no phone and no contact, check if remoteJid looks like LID mode
  if (!contact && !phone && remoteJid) {
    const { data: contactByJid } = await supabase
      .from('whatsapp_contacts')
      .select('id, lead_id, unread_count, phone')
      .eq('phone', remoteJid.split('@')[0])
      .single();
    
    contact = contactByJid;
  }

  // Cannot process message without phone or existing contact
  if (!phone && !contact) {
    console.log('No phone resolved and no existing contact found, skipping message');
    return;
  }

  const effectivePhone = phone || contact?.phone || remoteJid?.split('@')[0] || '';

  if (!contact) {
    const { data: newContact } = await supabase
      .from('whatsapp_contacts')
      .insert({
        phone: effectivePhone,
        name: pushName,
        lead_id: leadId || null,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select()
      .single();
    contact = newContact;
  } else {
    const currentUnread = typeof contact.unread_count === 'number' ? contact.unread_count : 0;

    await supabase
      .from('whatsapp_contacts')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: currentUnread + 1,
        lead_id: contact.lead_id || leadId || null,
        name: pushName || undefined,
      })
      .eq('id', contact.id);

    if (!contact.lead_id && leadId) {
      contact.lead_id = leadId;
    }
  }

  // Get instance
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('instance_name', instanceName)
    .single();

  // Save message
  await supabase.from('whatsapp_messages').insert({
    instance_id: instance?.id,
    contact_id: contact?.id,
    remote_jid: remoteJidToStore || remoteJid || `${phone}@s.whatsapp.net`,
    message_id: messageId,
    direction: 'incoming',
    message_type: 'text',
    content,
    status: 'delivered',
    lead_id: contact?.lead_id || leadId,
  });

  // Create notification for incoming messages
  if (contact?.lead_id || leadId) {
    const finalLeadId = contact?.lead_id || leadId;
    const { data: lead } = await supabase
      .from('leads')
      .select('assigned_to, name')
      .eq('id', finalLeadId)
      .single();

    if (lead?.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: lead.assigned_to,
        type: 'whatsapp_message',
        title: 'Nova mensagem WhatsApp',
        message: `${lead.name}: ${content.substring(0, 100)}`,
        link: '/whatsapp',
      });
    }
  }

  // Create lead interaction record
  if (leadId) {
    await supabase.from('lead_interactions').insert({
      lead_id: leadId,
      type: 'whatsapp',
      description: `Mensagem recebida via WhatsApp: ${content.substring(0, 200)}`,
    });
  }

  // ===== AI AGENT INTEGRATION =====
  // Check if there's an active AI agent linked to this WhatsApp instance
  if (instance?.id) {
    await processWithAIAgent(supabase, instance.id, instanceName, content, effectivePhone, leadId, contact?.id || null, remoteJidToStore || remoteJid || null, messageId, isAudio);
  }
}

// ===== DOWNLOAD AUDIO VIA EVOLUTION API =====
async function downloadAudioFromEvolution(instanceName: string, messageId: string): Promise<Blob | null> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionUrl || !evolutionApiKey) {
    console.error('[DownloadAudio] Evolution API not configured');
    return null;
  }

  try {
    // Use Evolution API to get base64 media
    console.log('[DownloadAudio] Fetching audio via Evolution API for message:', messageId);
    
    const response = await fetch(`${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DownloadAudio] Evolution API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[DownloadAudio] Got base64 response, length:', data.base64?.length || 0);
    
    if (!data.base64) {
      console.error('[DownloadAudio] No base64 in response');
      return null;
    }

    // Convert base64 to blob
    const binaryStr = atob(data.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: data.mimetype || 'audio/ogg' });
  } catch (error) {
    console.error('[DownloadAudio] Error:', error);
    return null;
  }
}

// ===== TRANSCRIBE AUDIO FROM WHATSAPP =====
async function transcribeWhatsAppAudio(instanceName: string, messageId: string): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.log('[Transcribe] No OpenAI API key for transcription');
    return null;
  }

  try {
    console.log('[Transcribe] Getting audio for message:', messageId);
    
    // Download the audio file via Evolution API
    const audioBlob = await downloadAudioFromEvolution(instanceName, messageId);
    if (!audioBlob) {
      console.error('[Transcribe] Failed to download audio');
      return null;
    }

    console.log('[Transcribe] Audio downloaded, size:', audioBlob.size);

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Transcribe] Whisper API error:', error);
      return null;
    }

    const data = await response.json();
    console.log('[Transcribe] Transcription result:', data.text);
    return data.text;
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return null;
  }
}

// ===== AI AGENT PROCESSING =====
async function processWithAIAgent(
  supabase: any,
  instanceId: string,
  instanceName: string,
  messageContent: string,
  phone: string,
  leadId: string | null,
  contactId: string | null,
  remoteJid: string | null,
  messageId: string,
  isAudio: boolean = false
) {
  // Track if we should respond with audio
  let shouldRespondWithAudio = false;
  
  // Check if content is audio placeholder - try to transcribe
  let actualMessage = messageContent;
  
  if (isAudio || messageContent === '[Áudio]') {
    console.log('[AI Agent] Audio message detected, attempting transcription via Evolution API...');
    const transcription = await transcribeWhatsAppAudio(instanceName, messageId);
    if (transcription) {
      actualMessage = transcription;
      shouldRespondWithAudio = true; // Respond with audio if client sent audio
      console.log('[AI Agent] Transcribed audio to:', actualMessage);
    } else {
      console.log('[AI Agent] Transcription failed, using placeholder');
      actualMessage = 'O cliente enviou um áudio mas não consegui transcrever. Por favor, peça para ele enviar em texto.';
    }
  }

  // Find AI agent linked to this instance
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('whatsapp_instance_id', instanceId)
    .eq('status', 'active')
    .eq('whatsapp_auto_reply', true)
    .single();

  if (agentError || !agent) {
    console.log('No active AI agent found for instance:', instanceId);
    return;
  }

  console.log('Found AI agent:', agent.id, agent.name);

  // Get or create conversation
  const sessionId = `whatsapp_${phone}_${new Date().toISOString().split('T')[0]}`;
  
  let { data: conversation } = await supabase
    .from('ai_agent_conversations')
    .select('id')
    .eq('agent_id', agent.id)
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .single();

  if (!conversation) {
    const { data: newConv, error: convError } = await supabase
      .from('ai_agent_conversations')
      .insert({
        agent_id: agent.id,
        session_id: sessionId,
        lead_id: leadId,
        channel: 'whatsapp',
        status: 'active',
        customer_phone: phone,
        metadata: { phone, instance_id: instanceId },
      })
      .select()
      .single();
    
    if (convError) {
      console.error('Error creating conversation:', convError);
      return;
    }
    conversation = newConv;
  }

  if (!conversation) {
    console.error('Failed to create conversation');
    return;
  }

  // Check if human takeover is active
  const { data: takeover } = await supabase
    .from('ai_agent_human_takeover')
    .select('id')
    .eq('conversation_id', conversation.id)
    .is('resolved_at', null)
    .single();

  if (takeover) {
    console.log('Human takeover active - skipping AI response');
    await supabase.from('ai_agent_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: messageContent,
    });
    return;
  }

  // Check for transfer keywords
  if (agent.transfer_to_human_enabled && agent.transfer_keywords?.length > 0) {
    const lowerContent = actualMessage.toLowerCase();
    const shouldTransfer = agent.transfer_keywords.some((keyword: string) => 
      lowerContent.includes(keyword.toLowerCase())
    );

    if (shouldTransfer) {
      console.log('Transfer keyword detected, creating human takeover');
      await supabase.from('ai_agent_human_takeover').insert({
        conversation_id: conversation.id,
        reason: `Usuário solicitou transferência: "${actualMessage}"`,
      });

      await sendWhatsAppMessage(
        instanceName,
        remoteJid || `${phone}@s.whatsapp.net`,
        'Entendi! Vou transferir você para um de nossos atendentes. Em breve alguém entrará em contato. 🙂'
      );

      if (leadId) {
        const { data: lead } = await supabase
          .from('leads')
          .select('assigned_to, name')
          .eq('id', leadId)
          .single();

        if (lead?.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            type: 'human_takeover',
            title: 'Transferência solicitada',
            message: `${lead.name} solicitou falar com um humano`,
            link: '/whatsapp',
          });
        }
      }
      return;
    }
  }

  // Save user message (with actual transcribed content)
  await supabase.from('ai_agent_messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: actualMessage,
  });

  // Get conversation history
  const { data: history } = await supabase
    .from('ai_agent_messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(agent.context_window_size || 10);

  const messages = history?.map((m: any) => ({
    role: m.role,
    content: m.content,
  })) || [{ role: 'user', content: actualMessage }];

  // ===== FETCH VEHICLES WITH PHOTOS =====
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
    .eq('status', 'disponivel')
    .limit(50);

  if (vehiclesError) {
    console.error('Error fetching vehicles:', vehiclesError);
  }

  console.log('[AI Agent] Fetched', vehicles?.length || 0, 'vehicles with images');

  // Build system prompt with vehicles INCLUDING PHOTOS
  let systemPrompt = agent.system_prompt || 'Você é um assistente virtual prestativo.';
  
  // Add Matheus Veículos context and photo instructions
  systemPrompt += `

Você é Léo, assistente virtual da MATHEUS VEÍCULOS.

===== REGRAS DE COMUNICAÇÃO =====
1. Sempre se apresente como Léo da Matheus Veículos
2. Seja BREVE e DIRETO - máximo 2-3 frases por resposta
3. NUNCA mande mensagens longas - quebre em parágrafos curtos
4. Use linguagem amigável e descontraída

===== MENSAGEM INICIAL =====
Se for a PRIMEIRA mensagem do cliente (ele disse apenas "oi", "olá", "bom dia", etc):
"Opa! Sou o Léo da Matheus Veículos 🚗

O que você está buscando hoje?"

⚠️ MAS se o cliente já chegou falando de um carro específico (ex: "tem Polo?", "quanto tá o Civic?"), responda sobre o carro DIRETO, sem essa apresentação genérica!

===== REGRA DE FOTOS =====
Se pedirem foto de um veículo:
1. Localize no estoque abaixo
2. Use a tag: [ENVIAR_FOTO: URL_DA_FOTO]
3. Copie a URL EXATA do campo "foto_principal"

Exemplo: "Olha só o Polo! 👇

[ENVIAR_FOTO: https://url-da-foto.jpg]

Bonito né? Quer agendar visita?"

⚠️ Se não tiver foto: "Esse modelo não tem foto no sistema ainda, mas posso te mostrar pessoalmente!"
`;

  if (vehicles?.length) {
    systemPrompt += '\n\n=== ESTOQUE MATHEUS VEÍCULOS ===\n';
    
    vehicles.forEach((v: any, i: number) => {
      const preco = v.sale_price ? `R$ ${Number(v.sale_price).toLocaleString('pt-BR')}` : 'Consultar';
      const km = v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : 'N/A';
      const ano = v.year_model || v.year_fabrication || 'N/A';
      const versao = v.version ? ` ${v.version}` : '';
      const fotos = v.images && v.images.length > 0 ? v.images : [];
      
      systemPrompt += `${v.brand} ${v.model}${versao} ${ano} | ${preco} | ${km}`;
      if (fotos.length > 0) {
        systemPrompt += ` | foto_principal: ${fotos[0]}`;
      }
      systemPrompt += '\n';
    });
    systemPrompt += '=== FIM ===\n';
  }

  // Call AI using Lovable Gateway (preferred)
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiResponse: string | null = null;

    if (LOVABLE_API_KEY) {
      console.log('[AI Agent] Using Lovable AI Gateway');
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: agent.temperature || 0.7,
          max_tokens: agent.max_tokens || 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content || null;
      } else {
        console.error('[AI Agent] Lovable Gateway error:', await response.text());
      }
    }

    // Fallback to OpenAI/Gemini if Lovable Gateway fails
    if (!aiResponse) {
      if (agent.llm_provider === 'openai') {
        aiResponse = await callOpenAI(agent, systemPrompt, messages);
      } else if (agent.llm_provider === 'google') {
        aiResponse = await callGemini(agent, systemPrompt, messages);
      }
    }

    if (!aiResponse) {
      console.error('No response from AI');
      return;
    }

    console.log('[AI Agent] Response:', aiResponse.substring(0, 200));

    // ===== EXTRACT AND SEND PHOTOS =====
    const photoRegex = /\[ENVIAR_FOTO:\s*(https?:\/\/[^\]\s]+)\]/gi;
    const extractedPhotos: string[] = [];
    let match;
    while ((match = photoRegex.exec(aiResponse)) !== null) {
      extractedPhotos.push(match[1].trim());
    }

    // Remove photo tags from text
    const cleanResponse = aiResponse.replace(photoRegex, '').trim();

    console.log('[AI Agent] Extracted photos:', extractedPhotos.length, extractedPhotos);

    // Save assistant message
    await supabase.from('ai_agent_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: cleanResponse,
    });

    const targetJid = remoteJid || `${phone}@s.whatsapp.net`;

    // ===== SEND TEXT RESPONSE FIRST (before photos) =====
    if (cleanResponse) {
      // Check if we should respond with audio (client sent audio)
      if (shouldRespondWithAudio && agent.enable_voice && agent.elevenlabs_api_key) {
        console.log('[AI Agent] Generating audio response via ElevenLabs...');
        const audioSent = await sendWhatsAppAudioResponse(
          instanceName, 
          targetJid, 
          cleanResponse, 
          agent.elevenlabs_api_key,
          agent.voice_id || 'nPczCjzI2devNBz1zQrb' // Default: Brian (Portuguese-friendly voice)
        );
        
        if (!audioSent) {
          // Fallback to text if audio fails
          console.log('[AI Agent] Audio failed, falling back to text');
          await sendTextInChunks(instanceName, targetJid, cleanResponse);
        }
      } else {
        // Send as text messages
        await sendTextInChunks(instanceName, targetJid, cleanResponse);
      }
    }

    // ===== SEND PHOTOS AFTER TEXT =====
    for (const photoUrl of extractedPhotos) {
      console.log('[AI Agent] Sending photo:', photoUrl);
      await sendWhatsAppImage(instanceName, targetJid, photoUrl);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Get instance for saving message
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('instance_name', instanceName)
      .single();

    await supabase.from('whatsapp_messages').insert({
      instance_id: instance?.id,
      contact_id: contactId,
      remote_jid: targetJid,
      message_id: `ai_${Date.now()}`,
      direction: 'outgoing',
      message_type: extractedPhotos.length > 0 ? 'image' : 'text',
      content: cleanResponse,
      status: 'sent',
      lead_id: leadId,
    });

    // Update metrics
    await updateAgentMetrics(supabase, agent.id);

  } catch (error) {
    console.error('Error processing AI agent:', error);
    await supabase.rpc('increment_agent_errors', { 
      p_agent_id: agent.id,
      p_error_type: 'ai_call_error'
    }).catch(() => {});
  }
}

// Call OpenAI API
async function callOpenAI(agent: any, systemPrompt: string, messages: any[]): Promise<string | null> {
  const apiKey = agent.api_key_encrypted || Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('No OpenAI API key configured');
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.llm_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: agent.temperature || 0.7,
      max_tokens: agent.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

// Call Google Gemini API
async function callGemini(agent: any, systemPrompt: string, messages: any[]): Promise<string | null> {
  const apiKey = agent.api_key_encrypted || Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!apiKey) {
    console.error('No Google AI API key configured');
    return null;
  }

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const model = agent.llm_model || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: agent.temperature || 0.7,
        maxOutputTokens: agent.max_tokens || 1024,
        topP: agent.top_p || 0.9,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    return null;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// Send WhatsApp message via Evolution API
async function sendWhatsAppMessage(instanceName: string, remoteJid: string, message: string): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionUrl || !evolutionApiKey) {
    console.error('Evolution API not configured');
    return false;
  }

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error sending WhatsApp message:', error);
      return false;
    }

    console.log('WhatsApp message sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

// Send text in chunks (multiple messages)
async function sendTextInChunks(instanceName: string, targetJid: string, text: string): Promise<void> {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);
  
  if (paragraphs.length > 1) {
    console.log('[AI Agent] Sending', paragraphs.length, 'separate messages');
    for (const paragraph of paragraphs) {
      await sendWhatsAppMessage(instanceName, targetJid, paragraph);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  } else if (text.length > 300) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim());
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 250) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    console.log('[AI Agent] Split long message into', chunks.length, 'chunks');
    for (const chunk of chunks) {
      await sendWhatsAppMessage(instanceName, targetJid, chunk);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  } else {
    await sendWhatsAppMessage(instanceName, targetJid, text);
  }
}

// Generate TTS with ElevenLabs and send audio via WhatsApp
async function sendWhatsAppAudioResponse(
  instanceName: string,
  remoteJid: string,
  text: string,
  elevenLabsApiKey: string,
  voiceId: string
): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionUrl || !evolutionApiKey) {
    console.error('[TTS] Evolution API not configured');
    return false;
  }

  try {
    console.log('[TTS] Generating audio with ElevenLabs, voice:', voiceId);
    
    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('[TTS] ElevenLabs API error:', error);
      return false;
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log('[TTS] Audio generated, size:', audioBuffer.byteLength);

    // Convert to base64 for Evolution API
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binary);
    
    console.log('[TTS] Sending audio via Evolution API...');
    
    // Send audio via Evolution API
    const response = await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'audio',
        media: `data:audio/mpeg;base64,${base64Audio}`,
        mimetype: 'audio/mpeg',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[TTS] Error sending WhatsApp audio:', error);
      return false;
    }

    console.log('[TTS] WhatsApp audio sent successfully');
    return true;
  } catch (error) {
    console.error('[TTS] Error:', error);
    return false;
  }
}

// Send WhatsApp IMAGE via Evolution API
async function sendWhatsAppImage(instanceName: string, remoteJid: string, imageUrl: string, caption?: string): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionUrl || !evolutionApiKey) {
    console.error('Evolution API not configured for image');
    return false;
  }

  try {
    console.log('[sendWhatsAppImage] Sending image to:', remoteJid, 'URL:', imageUrl);
    
    const response = await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'image',
        media: imageUrl,
        caption: caption || '',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error sending WhatsApp image:', error);
      return false;
    }

    console.log('WhatsApp image sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp image:', error);
    return false;
  }
}

// Update agent metrics
async function updateAgentMetrics(supabase: any, agentId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Try to increment existing metrics
  const { data: existing } = await supabase
    .from('ai_agent_metrics')
    .select('id, conversations_count')
    .eq('agent_id', agentId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('ai_agent_metrics')
      .update({ conversations_count: (existing.conversations_count || 0) + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_agent_metrics').insert({
      agent_id: agentId,
      date: today,
      conversations_count: 1,
    });
  }
}

// Process outgoing messages (sent by us)
async function processOutgoingMessage(
  supabase: any,
  message: any,
  instanceName: string,
  phone: string | null,
  remoteJidToStore: string | undefined,
  content: string,
  messageId: string
) {
  const remoteJid = message.key?.remoteJid;
  
  let contact: { id: string; lead_id?: string } | null = null;

  if (phone) {
    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('id, lead_id')
      .eq('phone', phone)
      .single();
    contact = existingContact;
  }

  if (!contact && !phone && remoteJid) {
    const { data: contactByJid } = await supabase
      .from('whatsapp_contacts')
      .select('id, lead_id')
      .eq('phone', remoteJid.split('@')[0])
      .single();
    contact = contactByJid;
  }

  // Get instance
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('instance_name', instanceName)
    .single();

  // Save message
  await supabase.from('whatsapp_messages').insert({
    instance_id: instance?.id,
    contact_id: contact?.id,
    remote_jid: remoteJidToStore || remoteJid,
    message_id: messageId,
    direction: 'outgoing',
    message_type: 'text',
    content,
    status: 'sent',
    lead_id: contact?.lead_id,
  });

  // Reset unread count when we send a message
  if (contact) {
    await supabase
      .from('whatsapp_contacts')
      .update({ unread_count: 0 })
      .eq('id', contact.id);
  }
}

// Create lead and assign via Round Robin
async function createLeadWithRoundRobin(
  supabase: any,
  phone: string,
  name: string
): Promise<string | null> {
  // Get next salesperson from Round Robin
  const assignedTo = await getNextRoundRobinSalesperson(supabase);
  
  console.log('Round Robin assigned to:', assignedTo);

  // Create lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      phone,
      name,
      source: 'whatsapp',
      status: 'novo',
      assigned_to: assignedTo,
    })
    .select()
    .single();

  if (leadError) {
    console.error('Error creating lead:', leadError);
    return null;
  }

  // Create lead assignment record
  if (assignedTo) {
    await supabase.from('lead_assignments').insert({
      lead_id: lead.id,
      salesperson_id: assignedTo,
      assignment_type: 'round_robin',
      notes: 'Atribuído automaticamente via Round Robin (WhatsApp)',
    });

    // Update round robin config
    await supabase
      .from('round_robin_config')
      .update({
        last_assigned_at: new Date().toISOString(),
        total_leads_assigned: supabase.rpc ? undefined : undefined, // Will increment via separate query
        current_leads_today: supabase.rpc ? undefined : undefined,
      })
      .eq('salesperson_id', assignedTo);

    // Increment counters
    await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: assignedTo });
  }

  // Create negotiation
  if (assignedTo) {
    const { error: negError } = await supabase.from('negotiations').insert({
      lead_id: lead.id,
      salesperson_id: assignedTo,
      status: 'contato_inicial',
      notes: 'Negociação criada automaticamente a partir de mensagem WhatsApp',
    });

    if (negError) {
      console.error('Error creating negotiation:', negError);
    } else {
      console.log('Created negotiation for lead:', lead.id);
    }
  }

  // Create notification for assigned salesperson
  if (assignedTo) {
    await supabase.from('notifications').insert({
      user_id: assignedTo,
      type: 'new_lead',
      title: 'Novo Lead Atribuído',
      message: `Um novo lead foi atribuído a você: ${name} (${phone})`,
      link: '/leads',
    });
  }

  return lead.id;
}

// Get next salesperson using Round Robin algorithm
async function getNextRoundRobinSalesperson(supabase: any): Promise<string | null> {
  // Get all active round robin configs ordered by last_assigned_at (oldest first)
  const { data: configs, error } = await supabase
    .from('round_robin_config')
    .select('*')
    .eq('is_active', true)
    .order('last_assigned_at', { ascending: true, nullsFirst: true });

  if (error || !configs || configs.length === 0) {
    console.log('No active round robin configs found');
    return null;
  }

  // Find the next eligible salesperson
  // Check if they haven't exceeded their daily limit
  const today = new Date().toISOString().split('T')[0];
  
  for (const config of configs) {
    // If max_leads_per_day is set, check if limit reached
    if (config.max_leads_per_day !== null) {
      // Check if last_assigned_at is from today
      const lastAssignedDate = config.last_assigned_at 
        ? new Date(config.last_assigned_at).toISOString().split('T')[0]
        : null;
      
      // Reset counter if it's a new day
      if (lastAssignedDate !== today) {
        config.current_leads_today = 0;
      }

      if (config.current_leads_today >= config.max_leads_per_day) {
        continue; // Skip this salesperson, they've reached their limit
      }
    }

    // This salesperson is eligible
    return config.salesperson_id;
  }

  // If all salespeople reached their limits, return the first one (least recently assigned)
  return configs[0]?.salesperson_id || null;
}

async function handleMessageUpdate(supabase: any, data: any) {
  // Evolution API can send updates in different shapes.
  const keyId = data?.keyId || data?.key?.id;
  if (!keyId) return;

  const rawStatus = data?.status ?? data?.update?.status;

  const numberStatusMap: Record<number, string> = {
    2: 'sent',
    3: 'delivered',
    4: 'read',
  };

  const stringStatusMap: Record<string, string> = {
    SERVER_ACK: 'sent',
    DELIVERY_ACK: 'delivered',
    READ: 'read',
    READ_ACK: 'read',
    FAILED: 'failed',
    ERROR: 'failed',
  };

  const status =
    typeof rawStatus === 'number'
      ? numberStatusMap[rawStatus]
      : typeof rawStatus === 'string'
        ? stringStatusMap[rawStatus]
        : undefined;

  if (!status) return;

  await supabase
    .from('whatsapp_messages')
    .update({ status })
    .eq('message_id', keyId);
}

async function handleConnectionUpdate(supabase: any, data: any, instanceName: string) {
  const { state } = data;
  const statusMap: Record<string, string> = {
    open: 'connected',
    close: 'disconnected',
    connecting: 'connecting',
  };

  const status = statusMap[state] || 'disconnected';
  
  await supabase
    .from('whatsapp_instances')
    .update({ status })
    .eq('instance_name', instanceName);
}

async function handleQRCodeUpdate(supabase: any, data: any, instanceName: string) {
  const { qrcode } = data;
  
  await supabase
    .from('whatsapp_instances')
    .update({ 
      qr_code: qrcode?.base64,
      status: 'qr_code',
      qr_code_expires_at: new Date(Date.now() + 60000).toISOString()
    })
    .eq('instance_name', instanceName);
}

function normalizePhone(input?: string): string | null {
  if (!input) return null;
  
  // Remove the @lid or @s.whatsapp.net suffix if present
  const cleaned = input.split('@')[0];
  const digits = cleaned.replace(/\D/g, '');
  
  if (!digits || digits.length < 10) return null;
  
  // If it's a LID (starts with 1 and has too many digits), it's not a valid phone
  if (digits.startsWith('1') && digits.length > 13) return null;
  
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function extractPhoneAndJid(message: any, payload: any): { phone: string | null; remoteJidToStore?: string } {
  const remoteJid = message?.key?.remoteJid as string | undefined;
  const remoteJidAlt = message?.key?.remoteJidAlt as string | undefined;
  const sender = payload?.sender as string | undefined;
  const participant = message?.key?.participant as string | undefined;
  const fromMe = message?.key?.fromMe === true;

  // For incoming messages (fromMe=false), the remoteJid is the sender's phone
  // For outgoing messages (fromMe=true), remoteJidAlt contains the real phone when using LID mode
  
  let phoneCandidate: string | null = null;
  let bestJid: string | undefined = undefined;

  // For incoming messages, prioritize remoteJid if it's a real phone (not LID)
  if (!fromMe && remoteJid && !remoteJid.endsWith('@lid')) {
    phoneCandidate = normalizePhone(remoteJid);
    bestJid = remoteJid;
  }

  // For outgoing messages or if remoteJid was LID, try remoteJidAlt
  if (!phoneCandidate && remoteJidAlt && !remoteJidAlt.endsWith('@lid')) {
    phoneCandidate = normalizePhone(remoteJidAlt);
    bestJid = remoteJidAlt;
  }
  
  // Try participant
  if (!phoneCandidate && participant && !participant.endsWith('@lid')) {
    phoneCandidate = normalizePhone(participant);
    bestJid = participant;
  }
  
  // Try sender from payload
  if (!phoneCandidate && sender && !sender.endsWith('@lid')) {
    phoneCandidate = normalizePhone(sender);
    bestJid = sender;
  }

  const remoteJidToStore = bestJid || (phoneCandidate ? `${phoneCandidate}@s.whatsapp.net` : undefined) || remoteJid;

  return { phone: phoneCandidate, remoteJidToStore };
}

async function findLeadIdByPhone(supabase: any, formattedPhone: string): Promise<string | null> {
  const phoneNoCountry = formattedPhone.replace(/^55/, '');
  const candidates = [formattedPhone, phoneNoCountry, `+${formattedPhone}`, `+${phoneNoCountry}`];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', candidate)
      .limit(1)
      .maybeSingle();

    if (data?.id) return data.id as string;
  }

  return null;
}

// Try to find an existing contact by lead_id when phone matching fails
async function findContactByLeadId(supabase: any, leadId: string): Promise<{ id: string; phone: string } | null> {
  const { data } = await supabase
    .from('whatsapp_contacts')
    .select('id, phone')
    .eq('lead_id', leadId)
    .limit(1)
    .maybeSingle();
  
  return data || null;
}
