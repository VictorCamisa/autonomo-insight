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
      // Detect lead origin from first message (WhatsApp organic vs Meta Ads campaign)
      const origin = await detectLeadOrigin(supabase, content);
      console.log('[Lead Origin] Detected:', origin);
      
      // Create new lead with origin information
      console.log('Creating new lead for phone:', phone, 'name:', pushName);
      leadId = await createLeadWithRoundRobin(supabase, phone, pushName || 'WhatsApp', origin);
      console.log('Created lead:', leadId);
    } else {
      // Check if this message reveals campaign origin (only for first 5 messages from lead)
      const { data: existingLead } = await supabase
        .from('leads')
        .select('source')
        .eq('id', leadId)
        .single();
      
      // Only check origin if current source is 'whatsapp' (organic)
      if (existingLead?.source === 'whatsapp') {
        // Count how many incoming messages from this lead exist
        const { count: messageCount } = await supabase
          .from('whatsapp_messages')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', leadId)
          .eq('is_from_me', false);
        
        // Only check origin for first 5 messages
        if ((messageCount || 0) <= 5) {
          const origin = await detectLeadOrigin(supabase, content);
          if (origin.source !== 'whatsapp') {
            console.log('[Lead Origin] Updating existing lead source from whatsapp to:', origin.source, '(message #' + (messageCount || 0) + ')');
            await supabase
              .from('leads')
              .update({ 
                source: origin.source,
                meta_campaign_id: origin.meta_campaign_id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', leadId);
          } else {
            await supabase
              .from('leads')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', leadId);
          }
        } else {
          // Beyond first 5 messages, just update timestamp
          await supabase
            .from('leads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }
      } else {
        // Already has non-whatsapp source, just update timestamp
        console.log('Updating existing lead:', leadId);
        await supabase
          .from('leads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', leadId);
      }
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

  // ===== CHECK NEGOTIATION STAGE - Get context for AI response =====
  let negotiationContext: { status: string; salesperson_id: string | null; salesperson_name: string | null } | null = null;
  
  if (leadId) {
    const { data: negotiation } = await supabase
      .from('negotiations')
      .select('status, salesperson_id')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (negotiation) {
      negotiationContext = {
        status: negotiation.status,
        salesperson_id: negotiation.salesperson_id,
        salesperson_name: null,
      };
      
      // Get salesperson name if exists
      if (negotiation.salesperson_id) {
        const { data: salesperson } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', negotiation.salesperson_id)
          .single();
        
        if (salesperson?.full_name) {
          negotiationContext.salesperson_name = salesperson.full_name;
        }
      }
      
      // Always notify salesperson when lead messages in negotiating/won stages
      if (['negociando', 'ganho'].includes(negotiation.status) && negotiation.salesperson_id) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('name')
          .eq('id', leadId)
          .single();
        
        await supabase.from('notifications').insert({
          user_id: negotiation.salesperson_id,
          type: 'whatsapp_message',
          title: '💬 Nova mensagem do lead',
          message: `${leadData?.name || 'Lead'}: "${actualMessage.substring(0, 100)}${actualMessage.length > 100 ? '...' : ''}"`,
          link: '/whatsapp',
        });
        
        console.log('[AI Agent] Notified salesperson:', negotiation.salesperson_id);
      }
    }
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

  // Get conversation history (fetch last N messages, most recent first, then reverse for chronological order)
  const contextWindowSize = agent.context_window_size || 20;
  const { data: historyReversed } = await supabase
    .from('ai_agent_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(contextWindowSize);

  // Reverse to get chronological order (oldest first)
  const history = historyReversed?.reverse() || [];
  
  console.log('[AI Agent] Loaded', history.length, 'messages from history');

  const messages = history.length > 0 
    ? history.map((m: any) => ({ role: m.role, content: m.content })) 
    : [{ role: 'user', content: actualMessage }];

  // ===== RAG: SEARCH FOR RELEVANT VEHICLES =====
  let relevantVehicles: any[] = [];
  let ragQueryInfo: any = null;
  
  // Check if message mentions a vehicle (use RAG for semantic search)
  const vehicleKeywords = ['carro', 'veículo', 'veiculo', 'modelo', 'marca', 'ano', 'preço', 'preco', 
    'polo', 'gol', 'onix', 'civic', 'corolla', 'hb20', 'hilux', 'toro', 'compass', 'tracker', 'kicks',
    'toyota', 'volkswagen', 'vw', 'chevrolet', 'gm', 'honda', 'hyundai', 'fiat', 'jeep', 'nissan', 'ford',
    'sedan', 'hatch', 'suv', 'pickup', 'caminhonete', 'creta', 'tcross', 't-cross', 'ka', 'fiesta'];
  
  const messageHasVehicleIntent = vehicleKeywords.some(k => actualMessage.toLowerCase().includes(k));
  
  if (messageHasVehicleIntent) {
    console.log('[RAG] Vehicle intent detected, calling RAG search...');
    try {
      // Call the RAG search edge function internally
      const ragResponse = await searchVehiclesWithRAG(actualMessage);
      if (ragResponse.vehicles && ragResponse.vehicles.length > 0) {
        relevantVehicles = ragResponse.vehicles;
        ragQueryInfo = ragResponse.query_info;
        console.log('[RAG] Found', relevantVehicles.length, 'relevant vehicles');
      }
    } catch (ragError) {
      console.error('[RAG] Search error:', ragError);
    }
  }
  
  // ===== FALLBACK: BUSCA DIRETA POR TEXTO =====
  // Se o RAG não encontrou nada mas tem intenção de veículo, buscar por nome/modelo
  if (relevantVehicles.length === 0 && messageHasVehicleIntent) {
    console.log('[RAG] No RAG results but vehicle intent detected - trying direct text search');
    
    // Extrair termos de busca da mensagem
    const searchTermsMatch = actualMessage.toLowerCase().match(
      /polo|gol|onix|civic|corolla|hb20|hilux|toro|compass|tracker|kicks|creta|tcross|t-cross|ka|fiesta|uno|palio|argo|strada|mobi|bravo|doblo|fit|city|hr-v|hrv|cruze|spin|cobalt|prisma|voyage|fox|saveiro|amarok|ranger|s10|frontier|l200|pajero|outlander|asx|jimny|vitara|duster|captur|logan|sandero|kwid|nivus|taos|tiguan|jetta|virtus|renegade|freemont|cronos|argo|pulse|fastback/gi
    );
    
    if (searchTermsMatch && searchTermsMatch.length > 0) {
      const searchTerm = searchTermsMatch[0];
      console.log('[RAG] Direct search for:', searchTerm);
      
      const { data: vehiclesByName } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .ilike('model', `%${searchTerm}%`)
        .limit(5);
      
      if (vehiclesByName && vehiclesByName.length > 0) {
        relevantVehicles = vehiclesByName;
        console.log('[RAG] Direct search found', relevantVehicles.length, 'vehicles');
      } else {
        // Tentar buscar por marca também
        const { data: vehiclesByBrand } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
          .eq('status', 'disponivel')
          .ilike('brand', `%${searchTerm}%`)
          .limit(5);
        
        if (vehiclesByBrand && vehiclesByBrand.length > 0) {
          relevantVehicles = vehiclesByBrand;
          console.log('[RAG] Brand search found', relevantVehicles.length, 'vehicles');
        }
      }
    }
    
    // ANTI-HALLUCINATION FIX: Se ainda não encontrou, busca limitada do estoque
    if (relevantVehicles.length === 0) {
      console.log('[RAG] Fetching limited fallback inventory');
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false })
        .limit(10);

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
      } else {
        relevantVehicles = vehicles || [];
      }
    }
  } else if (relevantVehicles.length === 0) {
    // No vehicle intent - don't inject any vehicles to prevent hallucinations
    console.log('[RAG] No vehicle intent detected - NOT injecting vehicle context');
  }

  console.log('[AI Agent] Using', relevantVehicles.length, 'vehicles for context');

  // ===== BUILD DYNAMIC PROMPT FROM DATABASE =====
  // Fetch knowledge base entries for this agent
  const { data: knowledgeEntries } = await supabase
    .from('ai_agent_knowledge')
    .select('title, content, category')
    .eq('agent_id', agent.id)
    .eq('is_active', true)
    .order('category', { ascending: true });

  // Fetch current qualification level settings
  const { data: currentLevelSetting } = await supabase
    .from('qualification_settings')
    .select('required_fields')
    .eq('level', 'CURRENT')
    .single();
  
  const currentQualLevel = currentLevelSetting?.required_fields?.[0] || 'Q2';
  
  const { data: qualLevelConfig } = await supabase
    .from('qualification_settings')
    .select('*')
    .eq('level', currentQualLevel)
    .single();

  console.log('[AI Agent] Loaded', knowledgeEntries?.length || 0, 'knowledge base entries');
  console.log('[AI Agent] Current qualification level:', currentQualLevel);

  // Build system prompt dynamically from database configuration
  let systemPrompt = agent.system_prompt || 'Você é um assistente virtual prestativo.';
  
  // ===== ANTI-HALLUCINATION GUARDRAILS (CRITICAL) =====
  const antiHallucinationRules = `

===== ⚠️ REGRAS CRÍTICAS DE ESTOQUE - LEIA COM ATENÇÃO =====
🚫 VOCÊ ESTÁ PROIBIDA DE INVENTAR INFORMAÇÕES!

🔴 ANTES DE RESPONDER SOBRE QUALQUER VEÍCULO:
1. LEIA a lista "VEÍCULOS DISPONÍVEIS" abaixo
2. PROCURE o modelo que o cliente perguntou (ex: "Doblo", "Civic", "Polo")
3. SE ENCONTRAR → Cite os detalhes EXATOS da lista (marca, modelo, ano, preço)
4. SE NÃO ENCONTRAR → Diga "esse modelo não está no estoque no momento"

❌ PROIBIDO INVENTAR:
- Não diga "foi vendido" se o carro simplesmente não está na lista
- Não confirme disponibilidade sem verificar a lista
- Não invente cores, anos, preços ou km
- Não diga "não temos" sem antes procurar na lista

✅ RESPOSTAS CORRETAS:
- Cliente: "Tem Doblo?" + Doblo NA lista → "Sim! Temos a Doblo [dados exatos da lista]!"
- Cliente: "Tem Civic?" + Civic NÃO na lista → "O Civic não está no estoque agora. Temos outros modelos como [cite da lista]..."
- Cliente: "Já vendeu a Doblo?" + Doblo NA lista → "Não, a Doblo ainda está disponível! [cite dados]"
- Cliente: "Já vendeu a Doblo?" + Doblo NÃO na lista → "Esse modelo não está no estoque no momento. Posso te mostrar outros?"

⚠️ SE NÃO SABE OU NÃO ENCONTROU → "Deixa eu verificar e já te retorno!"
⚠️ "Já vendeu?" É PERGUNTA SOBRE ESTOQUE - verifique a lista antes de responder!

===== FIM DAS REGRAS CRÍTICAS =====
`;

  systemPrompt = antiHallucinationRules + systemPrompt;
  
  // Add identity from database (display_name, gender, tone, welcome_message)
  const displayName = agent.display_name || agent.name || 'Assistente';
  const gender = agent.gender || 'female';
  const tone = agent.tone || 'friendly';
  const welcomeMessage = agent.welcome_message || '';
  const specialInstructions = agent.special_instructions || {};

  // Build identity section dynamically
  const genderLanguage = gender === 'female' 
    ? 'Use linguagem FEMININA: "obrigada", "animada", "empolgada", "feliz em ajudar"'
    : gender === 'male'
    ? 'Use linguagem MASCULINA: "obrigado", "animado", "empolgado", "feliz em ajudar"'
    : 'Use linguagem NEUTRA';

  const toneDescriptions: Record<string, string> = {
    friendly: 'Seja simpático(a), acolhedor(a) e descontraído(a)',
    professional: 'Seja profissional, cortês e objetivo(a)',
    informal: 'Seja informal, use gírias e seja bem descontraído(a)',
    formal: 'Seja formal, use tratamento respeitoso e linguagem culta',
  };
  const toneDescription = toneDescriptions[tone] || 'Seja simpático(a) e acolhedor(a)';

  systemPrompt += `

===== IDENTIDADE =====
- Você é ${displayName}. NUNCA se apresente com outro nome.
- ${genderLanguage}
- ${toneDescription}
`;

  // Add communication rules from special_instructions
  if (specialInstructions.be_brief) {
    systemPrompt += `\n- Seja BREVE e DIRETA - máximo 2-3 frases por resposta`;
  }
  if (specialInstructions.use_emojis) {
    systemPrompt += `\n- Use emojis para tornar a conversa mais amigável`;
  }
  if (specialInstructions.always_confirm) {
    systemPrompt += `\n- Sempre confirme o que o cliente disse antes de responder`;
  }

  // Add welcome message if configured
  if (welcomeMessage) {
    systemPrompt += `

===== MENSAGEM INICIAL =====
Se for a PRIMEIRA mensagem do cliente (ele disse apenas "oi", "olá", "bom dia", etc):
"${welcomeMessage}"

⚠️ MAS se o cliente já chegou falando de um carro específico, responda sobre o carro DIRETO!
`;
  }

  // Add special instructions for photos and year matching
  if (specialInstructions.year_matching_instructions) {
    systemPrompt += `

===== 🚗 REGRA DE ANO DO VEÍCULO =====
${specialInstructions.year_matching_instructions}
`;
  } else {
    // Default year matching rule
    systemPrompt += `

===== 🚗 REGRA DE ANO DO VEÍCULO =====
Se o cliente pedir um veículo de um ANO ESPECÍFICO e NÃO TIVERMOS EXATAMENTE esse ano:
1. NUNCA diga apenas "não temos"
2. SEMPRE sugira anos PRÓXIMOS que temos (±2 anos)
3. Seja proativo: "Não temos o Civic 2007, mas temos o Civic 2008 e 2015!"
`;
  }

  if (specialInstructions.photo_instructions) {
    systemPrompt += `

===== REGRA DE FOTOS =====
${specialInstructions.photo_instructions}
`;
  } else {
    // Default photo instructions
    systemPrompt += `

===== REGRA CRÍTICA DE FOTOS =====
⚠️ ATENÇÃO: NUNCA envie foto de um veículo diferente do que o cliente pediu!

Se pedirem foto de um veículo:
1. Localize o veículo EXATO no estoque pelo NOME
2. Verifique se esse veículo TEM "foto:" na linha dele
3. Se TEM foto: Use [ENVIAR_FOTO: URL] copiando a URL EXATA
4. Se NÃO TEM foto: DIGA que não tem foto disponível!

Exemplo CORRETO quando TEM foto:
"Olha só o Polo! 👇
[ENVIAR_FOTO: https://url-da-foto.jpg]"

Exemplo CORRETO quando NÃO TEM foto:
"O Ford Ka 2021 ainda não tem foto no sistema, mas posso te mostrar pessoalmente!"
`;
  }

  // Add data collection tags based on current qualification level
  if (specialInstructions.collect_data_tags !== false && qualLevelConfig) {
    const requiredFields = qualLevelConfig.required_fields || [];
    const optionalFields = qualLevelConfig.optional_fields || [];
    
    // Field labels for prompt
    const fieldLabels: Record<string, string> = {
      nome: 'Nome do cliente',
      telefone: 'Telefone',
      veiculo_interesse: 'Veículo de interesse',
      origem: 'Origem (como nos encontrou)',
      forma_pagamento: 'Forma de pagamento',
      orcamento: 'Orçamento disponível',
      entrada: 'Valor da entrada',
      parcela: 'Parcela desejada',
      veiculo_troca: 'Veículo na troca',
      tem_troca: 'Se tem carro para troca',
      cpf: 'CPF',
      nome_limpo: 'Nome limpo (SPC/Serasa)',
      profissao: 'Profissão',
      renda: 'Renda',
    };
    
    systemPrompt += `

===== 🎯 QUALIFICAÇÃO ${currentQualLevel} =====
Seu objetivo é coletar as seguintes informações de forma NATURAL na conversa:

📌 OBRIGATÓRIOS:
${requiredFields.map((f: string) => `- ${fieldLabels[f] || f}`).join('\n')}
`;

    if (optionalFields.length > 0) {
      systemPrompt += `
⭐ BÔNUS (se conseguir):
${optionalFields.map((f: string) => `- ${fieldLabels[f] || f}`).join('\n')}
`;
    }

    systemPrompt += `
📝 Quando o cliente CONFIRMAR uma informação, adicione a TAG correspondente NO FINAL:
- [DADO:veiculo_interesse=Polo 2020 TSI]
- [DADO:origem=facebook]
- [DADO:orcamento=50000]
- [DADO:forma_pagamento=financiamento]
- [DADO:parcela=2000]
- [DADO:entrada=10000]
- [DADO:tem_troca=sim]
- [DADO:veiculo_troca=Gol 2018]
- [DADO:nome_limpo=sim]
- [DADO:cpf=12345678900]

⚠️ Só adicione a tag quando o cliente CONFIRMAR a informação
🔑 Seja RÁPIDA! Não faça muitas perguntas de uma vez.
`;
  }

  // Add knowledge base entries
  if (knowledgeEntries && knowledgeEntries.length > 0) {
    systemPrompt += '\n\n===== BASE DE CONHECIMENTO =====\n';
    
    let currentCategory = '';
    for (const entry of knowledgeEntries) {
      if (entry.category !== currentCategory) {
        currentCategory = entry.category;
        systemPrompt += `\n--- ${currentCategory.toUpperCase()} ---\n`;
      }
      systemPrompt += `\n## ${entry.title}\n${entry.content}\n`;
    }
    systemPrompt += '\n===== FIM DA BASE =====\n';
  }

  // Add RAG context if we found relevant vehicles
  if (ragQueryInfo && ragQueryInfo.extracted_year && !ragQueryInfo.has_exact_year_match) {
    systemPrompt += `\n\n⚠️ ATENÇÃO: O cliente pediu ano ${ragQueryInfo.extracted_year}, mas NÃO TEMOS exatamente esse ano. Os veículos abaixo são os mais SIMILARES.\n`;
  }

  if (relevantVehicles.length > 0) {
    systemPrompt += '\n\n=== VEÍCULOS DISPONÍVEIS ===\n';
    
    relevantVehicles.forEach((v: any) => {
      const preco = v.sale_price ? `R$ ${Number(v.sale_price).toLocaleString('pt-BR')}` : 'Consultar';
      const km = v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : 'N/A';
      const ano = v.year_model || v.year_fabrication || 'N/A';
      const versao = v.version ? ` ${v.version}` : '';
      const fotos = v.images && v.images.length > 0 ? v.images : [];
      const similaridade = v.similarity ? ` (relevância: ${Math.round(v.similarity * 100)}%)` : '';
      
      systemPrompt += `• ${v.brand} ${v.model}${versao} ${ano} | ${preco} | ${km}`;
      if (fotos.length > 0) {
        systemPrompt += ` | foto: ${fotos[0]}`;
      } else {
        systemPrompt += ` | ⚠️ SEM FOTO`;
      }
      systemPrompt += `${similaridade}\n`;
    });
    systemPrompt += '=== FIM ===\n';
  } else {
    systemPrompt += '\n\n⚠️ Nenhum veículo disponível no momento.\n';
  }

  // ===== CONVERSATION MEMORY & CONTEXT =====
  // Fetch historical context to demonstrate memory
  if (leadId) {
    // Get lead info for context
    const { data: leadInfo } = await supabase
      .from('leads')
      .select('name, vehicle_interest, qualification_data, source, created_at')
      .eq('id', leadId)
      .single();
    
    // Get recent conversation history from all sessions
    const { data: historicalMessages } = await supabase
      .from('ai_agent_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(30);
    
    // Get lead interactions for more context
    const { data: interactions } = await supabase
      .from('lead_interactions')
      .select('type, description, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Build memory context
    let memoryContext = '\n\n===== 🧠 MEMÓRIA DA CONVERSA =====\n';
    memoryContext += '⚠️ IMPORTANTE: Use este contexto para demonstrar que você LEMBRA da conversa!\n\n';
    
    if (leadInfo) {
      memoryContext += `📋 DADOS DO CLIENTE:\n`;
      memoryContext += `- Nome: ${leadInfo.name || 'Não informado'}\n`;
      if (leadInfo.vehicle_interest) memoryContext += `- Interesse anterior: ${leadInfo.vehicle_interest}\n`;
      if (leadInfo.qualification_data) {
        const qd = leadInfo.qualification_data as Record<string, any>;
        if (qd.orcamento) memoryContext += `- Orçamento: R$ ${qd.orcamento}\n`;
        if (qd.entrada) memoryContext += `- Entrada: R$ ${qd.entrada}\n`;
        if (qd.parcela) memoryContext += `- Parcela: R$ ${qd.parcela}\n`;
        if (qd.tem_troca) memoryContext += `- Tem troca: ${qd.tem_troca}\n`;
        if (qd.veiculo_troca) memoryContext += `- Veículo troca: ${qd.veiculo_troca}\n`;
      }
    }
    
    // Add negotiation context if in special stages
    if (negotiationContext && ['negociando', 'ganho'].includes(negotiationContext.status)) {
      memoryContext += `\n🔔 CONTEXTO ESPECIAL - ${negotiationContext.status === 'ganho' ? 'VENDA FECHADA' : 'EM NEGOCIAÇÃO'}:\n`;
      memoryContext += `- O cliente está sendo atendido pelo vendedor ${negotiationContext.salesperson_name || 'da equipe'}\n`;
      memoryContext += `- O vendedor usa um NÚMERO DIFERENTE (não este WhatsApp)\n`;
      memoryContext += `- Se o cliente voltou a falar AQUI, provavelmente:\n`;
      memoryContext += `  1. Não conseguiu contato com o vendedor\n`;
      memoryContext += `  2. Tem uma dúvida rápida\n`;
      memoryContext += `  3. Quer falar sobre outro assunto\n\n`;
      memoryContext += `📝 SUA TAREFA:\n`;
      memoryContext += `- Seja acolhedora e demonstre que lembra dele!\n`;
      memoryContext += `- Pergunte educadamente como pode ajudar\n`;
      memoryContext += `- Se for sobre a negociação em andamento, informe que ${negotiationContext.salesperson_name || 'o vendedor'} vai entrar em contato\n`;
      memoryContext += `- Se for uma dúvida simples, responda normalmente\n`;
      memoryContext += `- Se for sobre outro veículo, continue o atendimento!\n\n`;
      memoryContext += `EXEMPLO DE RESPOSTA BOA:\n`;
      memoryContext += `"Oi [nome]! 😊 Tudo bem? Lembro de você, conversamos sobre o [veículo]. Como posso te ajudar agora?"\n`;
    } else if (negotiationContext && negotiationContext.status === 'follow_up') {
      memoryContext += `\n🔔 CONTEXTO: REENGAJAMENTO (follow-up)\n`;
      memoryContext += `- Este cliente estava em acompanhamento\n`;
      memoryContext += `- Demonstre que lembra dele e seja acolhedora\n`;
      memoryContext += `- Pergunte se ainda tem interesse ou se podemos ajudar\n`;
    }
    
    // Add recent interaction history
    if (interactions && interactions.length > 0) {
      memoryContext += `\n📜 HISTÓRICO DE INTERAÇÕES:\n`;
      interactions.slice(0, 5).forEach((i: any) => {
        const date = new Date(i.created_at).toLocaleDateString('pt-BR');
        memoryContext += `- ${date}: ${i.description?.substring(0, 80) || i.type}\n`;
      });
    }
    
    memoryContext += '\n===== FIM MEMÓRIA =====\n';
    
    systemPrompt += memoryContext;
    
    console.log('[AI Agent] Added memory context. Negotiation status:', negotiationContext?.status || 'none');
  }

  // Call AI using OpenAI directly
  try {
    let aiResponse: string | null = null;

    console.log('[AI Agent] Calling OpenAI API directly');
    aiResponse = await callOpenAI(agent, systemPrompt, messages);

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

    // Remove photo tags AND data tags from text
    let cleanResponse = aiResponse.replace(photoRegex, '');
    cleanResponse = cleanResponse.replace(/\[DADO:[^\]]+\]/g, '').trim();

    console.log('[AI Agent] Extracted photos:', extractedPhotos.length, extractedPhotos);

    // ===== QUALIFICATION FLOW =====
    let finalResponse = cleanResponse;
    
    if (leadId) {
      // Get pre-assigned salesperson name to replace [vendedor] placeholder
      const { data: leadData } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', leadId)
        .single();
      
      if (leadData?.assigned_to) {
        const { data: salesperson } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', leadData.assigned_to)
          .single();
        
        if (salesperson?.full_name) {
          // Replace [vendedor] placeholder with actual name
          finalResponse = finalResponse.replace(/\[vendedor\]/gi, salesperson.full_name);
          console.log('[AI Agent] Replaced [vendedor] with:', salesperson.full_name);
        }
      }

      // 1. Extract qualification data from AI response (using ORIGINAL response with tags + AI analysis)
      const qualResult = await extractAndSaveQualificationData(supabase, leadId, aiResponse, conversation.id);
      
      // 2. Check and progress negotiation status based on message count
      await checkAndProgressNegotiation(supabase, conversation.id, leadId);
      
      // 3. If newly qualified, add handoff message
      if (qualResult.newlyQualified && qualResult.salespersonName) {
        console.log('[Qualification] Lead newly qualified! Adding handoff message');
        const handoffMessage = `\n\n🎉 Excelente! Consegui todas as informações!

O ${qualResult.salespersonName} vai entrar em contato com você em breve para dar continuidade ao seu atendimento.

Ele já está com todo o histórico da nossa conversa! 👍`;
        
        finalResponse = finalResponse + handoffMessage;
      }
    }

    // Save assistant message (with clean response, no tags)
    await supabase.from('ai_agent_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: finalResponse,
    });

    const targetJid = remoteJid || `${phone}@s.whatsapp.net`;

    // ===== SEND TEXT RESPONSE FIRST (before photos) =====
    if (finalResponse) {
      // Check if we should respond with audio (client sent audio)
      if (shouldRespondWithAudio && agent.enable_voice && agent.elevenlabs_api_key) {
        console.log('[AI Agent] Generating audio response via ElevenLabs...');
        const audioSent = await sendWhatsAppAudioResponse(
          instanceName, 
          targetJid, 
          finalResponse, 
          agent.elevenlabs_api_key,
          agent.voice_id || 'nPczCjzI2devNBz1zQrb' // Default: Brian (Portuguese-friendly voice)
        );
        
        if (!audioSent) {
          // Fallback to text if audio fails
          console.log('[AI Agent] Audio failed, falling back to text');
          await sendTextInChunks(instanceName, targetJid, finalResponse);
        }
      } else {
        // Send as text messages
        await sendTextInChunks(instanceName, targetJid, finalResponse);
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
      content: finalResponse,
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
  // CRITICAL: ALWAYS use environment variable - ignore any stored key
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  console.log('[OpenAI] Using API key from env:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
  
  if (!apiKey) {
    console.error('No OpenAI API key configured in environment');
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
      // ANTI-HALLUCINATION: Temperature mais baixa para respostas precisas
      // Forçamos máximo de 0.35 para evitar criatividade excessiva
      temperature: Math.min(agent.temperature || 0.35, 0.35),
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

// Send text in chunks (multiple messages) with natural delay
async function sendTextInChunks(instanceName: string, targetJid: string, text: string): Promise<void> {
  // Random delay between 2-4 seconds to feel more human
  const getHumanDelay = () => 2000 + Math.random() * 2000;
  
  const paragraphs = text
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);
  
  if (paragraphs.length > 1) {
    console.log('[AI Agent] Sending', paragraphs.length, 'separate messages');
    for (let i = 0; i < paragraphs.length; i++) {
      await sendWhatsAppMessage(instanceName, targetJid, paragraphs[i]);
      if (i < paragraphs.length - 1) {
        const delay = getHumanDelay();
        console.log('[AI Agent] Waiting', Math.round(delay), 'ms before next message');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
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
    for (let i = 0; i < chunks.length; i++) {
      await sendWhatsAppMessage(instanceName, targetJid, chunks[i]);
      if (i < chunks.length - 1) {
        const delay = getHumanDelay();
        console.log('[AI Agent] Waiting', Math.round(delay), 'ms before next message');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Upload audio to Supabase Storage and get public URL
    const fileName = `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    
    console.log('[TTS] Uploading audio to Supabase Storage...');
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/vehicle-images/ai-audio/${fileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'audio/mpeg',
          'x-upsert': 'true',
        },
        body: new Uint8Array(audioBuffer),
      }
    );

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('[TTS] Upload error:', uploadError);
      return false;
    }

    // Get public URL
    const audioUrl = `${supabaseUrl}/storage/v1/object/public/vehicle-images/ai-audio/${fileName}`;
    console.log('[TTS] Audio uploaded, URL:', audioUrl);
    
    console.log('[TTS] Sending audio via Evolution API (sendWhatsAppAudio endpoint with URL)...');
    
    // Send audio via Evolution API using URL
    const response = await fetch(`${evolutionUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        audio: audioUrl,
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

// ===== DETECT LEAD ORIGIN FROM MESSAGE =====
// Analyzes first message to identify if it came from Meta Ads campaign or organic WhatsApp
async function detectLeadOrigin(
  supabase: any,
  firstMessage: string
): Promise<{
  source: 'whatsapp' | 'facebook' | 'instagram';
  meta_campaign_id: string | null;
  campaign_name: string | null;
}> {
  // Default: organic WhatsApp
  const defaultOrigin = { source: 'whatsapp' as const, meta_campaign_id: null, campaign_name: null };
  
  if (!firstMessage) {
    return defaultOrigin;
  }

  // Patterns that indicate message came from Meta Ads campaign
  // These are common "ready messages" from Facebook/Instagram ads
  const campaignPatterns = [
    /vi\s+(seu|o|esse)\s+an[uú]ncio/i,           // "vi seu anúncio", "vi o anúncio"
    /interesse\s+(no|nesse)\s+an[uú]ncio/i,      // "interesse no anúncio"
    /vi\s+no\s+(facebook|instagram|face|insta)/i, // "vi no Facebook"
    /an[uú]ncio\s+(do|da|de|sobre)/i,            // "anúncio do carro"
    /cliquei\s+no\s+an[uú]ncio/i,                // "cliquei no anúncio"
    /pelo\s+an[uú]ncio/i,                        // "pelo anúncio"
    /encontrei\s+(no|pelo)\s+(facebook|instagram)/i, // "encontrei no Facebook"
    /an[uú]ncio\s+de\s+ve[ií]culo/i,             // "anúncio de veículo"
    /vim\s+pelo\s+(facebook|instagram|face|insta)/i, // "vim pelo Facebook"
    /propaganda\s+(do|da|de)/i,                  // "propaganda do carro"
    /vi\s+a\s+propaganda/i,                      // "vi a propaganda"
    /publicidade/i,                               // "publicidade"
    /olá,?\s+gostaria\s+de\s+(saber|mais|informações)/i, // Meta Ads ready message pattern
  ];

  const isFromCampaign = campaignPatterns.some(pattern => pattern.test(firstMessage));

  if (!isFromCampaign) {
    console.log('[Lead Origin] Message appears organic, source: whatsapp');
    return defaultOrigin;
  }

  console.log('[Lead Origin] Campaign pattern detected in message');

  // Detect if message mentions Instagram specifically (check before campaign lookup)
  const isInstagram = /instagram|insta/i.test(firstMessage);
  const defaultSource = isInstagram ? 'instagram' : 'facebook';

  // Try to extract car/vehicle name from message
  // Patterns like "anúncio do polo", "vi o civic", "propaganda da hilux"
  const carNamePatterns = [
    /an[uú]ncio\s+(?:do|da|de)\s+(\w+)/i,
    /vi\s+(?:o|a|um|uma)\s+(\w+)/i,
    /propaganda\s+(?:do|da|de)\s+(\w+)/i,
    /interesse\s+(?:no|na|pelo|pela)\s+(\w+)/i,
    /sobre\s+(?:o|a)\s+(\w+)/i,
  ];

  let extractedCarName: string | null = null;
  for (const pattern of carNamePatterns) {
    const match = firstMessage.match(pattern);
    if (match && match[1]) {
      // Ignore common words that aren't car names
      const commonWords = ['carro', 'veiculo', 'veículo', 'anuncio', 'anúncio', 'esse', 'este', 'aquele'];
      if (!commonWords.includes(match[1].toLowerCase())) {
        extractedCarName = match[1].toLowerCase();
        break;
      }
    }
  }

  console.log('[Lead Origin] Extracted car name from message:', extractedCarName);

  // Only try to link campaign if we extracted a car name
  if (extractedCarName) {
    // Search for active campaign that contains the car name
    const { data: matchingCampaigns } = await supabase
      .from('meta_campaigns')
      .select('id, name')
      .eq('status', 'ACTIVE')
      .ilike('name', `%${extractedCarName}%`);

    if (matchingCampaigns && matchingCampaigns.length > 0) {
      const matchedCampaign = matchingCampaigns[0];
      console.log('[Lead Origin] Matched campaign by car name:', matchedCampaign.name, 'source:', defaultSource);
      return {
        source: defaultSource,
        meta_campaign_id: matchedCampaign.id,
        campaign_name: matchedCampaign.name,
      };
    } else {
      console.log('[Lead Origin] No campaign found matching car name:', extractedCarName);
    }
  }

  // No matching campaign found, just set source without campaign link
  console.log('[Lead Origin] Setting source as', defaultSource, 'without campaign link');
  return { source: defaultSource, meta_campaign_id: null, campaign_name: null };
}

// Create lead - Q0 stage (no salesperson assigned yet, happens at Q1)
async function createLeadWithRoundRobin(
  supabase: any,
  phone: string,
  name: string,
  origin: {
    source: 'whatsapp' | 'facebook' | 'instagram';
    meta_campaign_id: string | null;
    campaign_name: string | null;
  } = { source: 'whatsapp', meta_campaign_id: null, campaign_name: null }
): Promise<string | null> {
  console.log('[Lead Creation Q0] Creating lead with origin:', origin.source, 'campaign:', origin.campaign_name || 'none');

  // Q0: Lead created with name + phone - DO NOT assign salesperson yet
  // Salesperson will be assigned at Q1 (when we confirm name + phone in conversation)
  
  // Create lead WITHOUT assigned_to - this will be set at Q1
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      phone,
      name,
      source: origin.source,
      status: 'novo',
      assigned_to: null, // NOT assigned until Q1
      qualification_status: 'nao_qualificado',
      meta_campaign_id: origin.meta_campaign_id,
    })
    .select()
    .single();

  if (leadError) {
    console.error('Error creating lead:', leadError);
    return null;
  }

  console.log('[Lead Creation Q0] Lead created:', lead.id, 'source:', origin.source, '- awaiting Q1 for assignment');

  // Create negotiation with atendimento_ia status (AI handling) - salesperson assigned at Q1
  const { error: negError } = await supabase.from('negotiations').insert({
    lead_id: lead.id,
    salesperson_id: null, // Will be assigned at Q1
    status: 'atendimento_ia', // NEW: Start in AI handling stage
    last_message_at: new Date().toISOString(), // Track last message for follow-up logic
    notes: origin.meta_campaign_id 
      ? `Negociação iniciada via ${origin.source.toUpperCase()} - Campanha: ${origin.campaign_name} - Atendimento IA` 
      : 'Negociação iniciada via WhatsApp - Atendimento IA',
  });

  if (negError) {
    console.error('Error creating negotiation:', negError);
  } else {
    console.log('[Lead Creation Q0] Negotiation created with atendimento_ia status for lead:', lead.id);
  }

  // Create qualification data tracker at Q0 level
  const { error: qualError } = await supabase.from('lead_qualification_data').insert({
    lead_id: lead.id,
    message_count: 0,
    is_qualified: false,
    qualification_level: 'q0', // Start at Q0
    q1_reached_at: null,
    q2_reached_at: null,
  });

  if (qualError) {
    console.error('Error creating qualification data:', qualError);
  } else {
    console.log('[Lead Creation Q0] Qualification tracker created at Q0 level');
  }

  // Log campaign attribution if from Meta Ads
  if (origin.meta_campaign_id) {
    await supabase.from('lead_interactions').insert({
      lead_id: lead.id,
      type: 'system',
      description: `Lead originado de campanha Meta Ads (${origin.source.toUpperCase()}): ${origin.campaign_name}`,
    });
    console.log('[Lead Origin] Campaign attribution logged for lead:', lead.id);
  }

  return lead.id;
}

// Check and progress negotiation status based on message count
async function checkAndProgressNegotiation(
  supabase: any,
  conversationId: string,
  leadId: string
): Promise<void> {
  // Count messages in conversation
  const { count } = await supabase
    .from('ai_agent_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  console.log('[Qualification] Message count:', count);

  // Update message count in qualification data
  await supabase
    .from('lead_qualification_data')
    .update({ message_count: count })
    .eq('lead_id', leadId);

  // Update last_message_at on negotiation for follow-up tracking
  const { data: negotiation } = await supabase
    .from('negotiations')
    .select('id, status')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (negotiation) {
    // Always update last_message_at for active conversations
    await supabase
      .from('negotiations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', negotiation.id);
    
    console.log('[Qualification] Updated last_message_at for negotiation:', negotiation.id);
  }
}

// Extract qualification data and check for Q1/Q2 progression
async function extractAndSaveQualificationData(
  supabase: any,
  leadId: string,
  aiResponse: string,
  conversationId?: string
): Promise<{ isQualified: boolean; newlyQualified: boolean; salespersonName?: string; qualificationLevel: string }> {
  // First, try to extract from tags in the AI response (legacy method)
  const tagUpdates = extractDataFromTags(aiResponse);
  
  // If we have a conversation ID, also use AI to analyze the full conversation for more robust extraction
  let aiExtractedUpdates: Record<string, any> = {};
  
  if (conversationId) {
    try {
      aiExtractedUpdates = await extractDataWithAI(supabase, conversationId, leadId);
    } catch (e) {
      console.error('[Qualification] AI extraction failed:', e);
    }
  }
  
  // Merge updates: AI extraction takes precedence as it analyzes full context
  const updates = { ...tagUpdates, ...aiExtractedUpdates };
  
  if (Object.keys(updates).length > 0) {
    console.log('[Qualification] Extracted data:', updates);
    
    // Update lead_qualification_data (legacy table)
    await supabase
      .from('lead_qualification_data')
      .update(updates)
      .eq('lead_id', leadId);
    
    // ===== NEW: Also update leads.qualification_data JSONB for the new Q1/Q2/Q3 system =====
    // Get existing qualification_data from leads table
    const { data: existingLead } = await supabase
      .from('leads')
      .select('qualification_data, vehicle_interest')
      .eq('id', leadId)
      .single();
    
    const existingQualData = (existingLead?.qualification_data as Record<string, any>) || {};
    
    // Map the updates to the new qualification_data format
    const newQualData: Record<string, any> = { ...existingQualData };
    
    if (updates.vehicle_interest) newQualData.veiculo_interesse = updates.vehicle_interest;
    if (updates.budget) newQualData.orcamento = updates.budget;
    if (updates.down_payment) newQualData.entrada = updates.down_payment;
    if (updates.desired_installment) newQualData.parcela = updates.desired_installment;
    if (updates.has_trade_in !== undefined) newQualData.tem_troca = updates.has_trade_in;
    if (updates.trade_in_vehicle) newQualData.veiculo_troca = updates.trade_in_vehicle;
    if (updates.clean_credit !== undefined) newQualData.nome_limpo = updates.clean_credit;
    if (updates.lead_source_confirmed) newQualData.origem = updates.lead_source_confirmed;
    if (updates.payment_method) newQualData.forma_pagamento = updates.payment_method;
    if (updates.cpf) newQualData.cpf = updates.cpf;
    
    // Calculate score based on filled fields
    const filledFields = Object.keys(newQualData).filter(k => 
      newQualData[k] !== undefined && newQualData[k] !== null && newQualData[k] !== ''
    );
    const score = Math.min(100, filledFields.length * 15);
    const status = score >= 80 ? 'complete' : score > 0 ? 'partial' : 'pending';
    
    // Update leads table with new qualification data
    const leadsUpdate: Record<string, any> = {
      qualification_data: newQualData,
      qualification_score: score,
    };
    
    // Also update vehicle_interest for visibility in CRM
    if (updates.vehicle_interest) {
      leadsUpdate.vehicle_interest = updates.vehicle_interest;
    }
    
    console.log('[Qualification] Updating leads.qualification_data:', newQualData, 'score:', score);
    
    await supabase
      .from('leads')
      .update(leadsUpdate)
      .eq('id', leadId);
  }

  // Check current qualification data
  const { data: qualData } = await supabase
    .from('lead_qualification_data')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (!qualData) {
    return { isQualified: false, newlyQualified: false, qualificationLevel: 'q0' };
  }

  const currentLevel = qualData.qualification_level || 'q0';

  // ===== Q1 CHECK: Name + WhatsApp confirmed (we already have this from lead creation) =====
  // Q1 is auto-achieved when first message is received (we have name from pushName and phone)
  // At Q1, we assign a salesperson via round-robin
  if (currentLevel === 'q0') {
    console.log('[Q1 Check] Lead at Q0, checking for Q1 eligibility...');
    
    // We already have name and phone from the lead - automatically move to Q1
    const { data: lead } = await supabase
      .from('leads')
      .select('name, phone, assigned_to')
      .eq('id', leadId)
      .single();

    if (lead?.name && lead?.phone && !lead?.assigned_to) {
      console.log('[Q1] Name + Phone confirmed, assigning salesperson via round-robin');
      
      // Assign salesperson via round-robin NOW
      const assignedTo = await getNextRoundRobinSalesperson(supabase);
      
      if (assignedTo) {
        // Increment round-robin counters
        await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: assignedTo });
        
        // Update lead with assigned salesperson
        await supabase
          .from('leads')
          .update({ assigned_to: assignedTo })
          .eq('id', leadId);
        
        // Update negotiation with salesperson
        await supabase
          .from('negotiations')
          .update({ salesperson_id: assignedTo })
          .eq('lead_id', leadId);
        
        // Create lead assignment record
        await supabase.from('lead_assignments').insert({
          lead_id: leadId,
          salesperson_id: assignedTo,
          assignment_type: 'round_robin',
          notes: 'Atribuído no Q1 - Nome e WhatsApp confirmados',
        });
        
        console.log('[Q1] Salesperson assigned:', assignedTo);
      }
      
      // Update qualification level to Q1
      await supabase
        .from('lead_qualification_data')
        .update({
          qualification_level: 'q1',
          q1_reached_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId);
      
      console.log('[Q1] Lead progressed to Q1');
    }
  }

  // ===== CRITICAL: Check if already Q2 BEFORE trying to progress =====
  // If already Q2, do NOT re-trigger handoff
  if (qualData.qualification_level === 'q2' || qualData.is_qualified) {
    console.log('[Q2 Check] Lead already at Q2/qualified - skipping progression');
    return { isQualified: true, newlyQualified: false, qualificationLevel: 'q2' };
  }

  // ===== Q2 CHECK: Q1 + Vehicle Interest =====
  // Q2 requires: vehicle_interest detected in THIS conversation (updates), not just historical data
  const currentLevelAfterQ1 = currentLevel === 'q0' ? 'q1' : currentLevel;
  
  if (currentLevelAfterQ1 === 'q1') {
    // CRITICAL: Only use NEW updates.vehicle_interest, NOT historical qualData.vehicle_interest
    // This prevents triggering handoff just because lead had interest in a previous conversation
    const hasNewVehicleInterest = !!updates.vehicle_interest;
    
    console.log('[Q2 Check] Has NEW vehicle interest in this message:', hasNewVehicleInterest);
    console.log('[Q2 Check] Historical vehicle_interest:', qualData.vehicle_interest || 'none');
    
    if (hasNewVehicleInterest) {
      console.log('[Q2] Vehicle interest confirmed, progressing to Q2');
      
      // Get assigned salesperson name for handoff message
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to, name, phone, vehicle_interest')
        .eq('id', leadId)
        .single();
      
      let salespersonName: string | undefined;
      
      if (lead?.assigned_to) {
        const { data: salesperson } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', lead.assigned_to)
          .single();
        
        salespersonName = salesperson?.full_name || undefined;
        
        // Get qualification data for notification
        const updatedQualData = { ...qualData, ...updates };
        
        // Create notification for assigned salesperson
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          type: 'lead_qualified',
          title: '🔥 Lead Qualificado (Q2)!',
          message: `${lead.name || 'Novo lead'} interessado em: ${updatedQualData.vehicle_interest || 'Veículo não especificado'}`,
          link: '/crm',
        });
        
        console.log('[Q2] Notification created for salesperson:', lead.assigned_to);
        
        // Send WhatsApp notification to salesperson
        if (salesperson?.phone) {
          await sendWhatsAppToSalesperson(supabase, salesperson.phone, lead, updatedQualData);
        }
      }
      
      // Update to Q2
      await supabase
        .from('lead_qualification_data')
        .update({
          qualification_level: 'q2',
          q2_reached_at: new Date().toISOString(),
          is_qualified: true,
          qualified_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId);
      
      // Update lead status
      await supabase
        .from('leads')
        .update({ qualification_status: 'qualificado' })
        .eq('id', leadId);
      
      // Update negotiation status from atendimento_ia → negociando (Q2 handoff)
      await supabase
        .from('negotiations')
        .update({
          status: 'negociando', // Move from AI handling to active negotiation
          notes: 'Lead qualificado (Q2) - transferido ao vendedor',
        })
        .eq('lead_id', leadId);
      
      return { 
        isQualified: true, 
        newlyQualified: true, 
        qualificationLevel: 'q2',
        salespersonName 
      };
    }
  }

  // Already at Q2 check was moved to beginning of function for early exit

  return { isQualified: false, newlyQualified: false, qualificationLevel: currentLevelAfterQ1 };
}

// Extract data from [DADO:field=value] tags (legacy method)
function extractDataFromTags(aiResponse: string): Record<string, any> {
  const regex = /\[DADO:(\w+)=([^\]]+)\]/g;
  const updates: Record<string, any> = {};
  
  let match;
  while ((match = regex.exec(aiResponse)) !== null) {
    const [_, field, value] = match;
    
    switch (field) {
      case 'veiculo_interesse':
        updates.vehicle_interest = value;
        break;
      case 'orcamento':
        updates.budget = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
        break;
      case 'parcela':
        updates.desired_installment = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
        break;
      case 'entrada':
        updates.down_payment = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
        break;
      case 'tem_troca':
        updates.has_trade_in = value.toLowerCase() === 'sim' || value.toLowerCase() === 'true';
        break;
      case 'veiculo_troca':
        updates.trade_in_vehicle = value;
        break;
      case 'nome_limpo':
        updates.clean_credit = value.toLowerCase() === 'sim' || value.toLowerCase() === 'true';
        break;
      case 'cpf':
        updates.cpf = value.replace(/[^\d]/g, '');
        break;
    }
  }
  
  return updates;
}

// Use AI to analyze conversation and extract qualification data
async function extractDataWithAI(
  supabase: any,
  conversationId: string,
  leadId: string
): Promise<Record<string, any>> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.log('[Qualification] OPENAI_API_KEY not set, skipping AI extraction');
    return {};
  }
  
  // Run AI extraction on every message to ensure real-time updates
  console.log('[Qualification] Starting AI extraction for lead:', leadId);
  
  // Get last 10 messages from conversation
  const { data: messages } = await supabase
    .from('ai_agent_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (!messages || messages.length < 2) {
    return {};
  }
  
  // Build conversation text
  const conversationText = messages
    .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Vendedor'}: ${m.content}`)
    .join('\n\n');
  
  console.log('[Qualification] Running AI extraction on', messages.length, 'messages');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um extrator RIGOROSO de dados de conversas de vendas de veículos.

⚠️ REGRAS CRÍTICAS - SIGA À RISCA:

1. EXTRAIA APENAS informações que o CLIENTE disse EXPLICITAMENTE nas mensagens
2. NÃO INVENTE DADOS sob nenhuma circunstância
3. Se o cliente disse apenas "oi", "olá", "boa tarde" = retorne {}
4. Se o cliente fez uma pergunta genérica como "vocês tem carro?" sem especificar modelo = NÃO extraia vehicle_interest
5. vehicle_interest SÓ deve ser preenchido se o cliente MENCIONOU um modelo específico (ex: "quero um Polo", "tem Civic 2020?")

⚠️ CUIDADO COM FALSOS POSITIVOS DE TROCA:
- "Já vendeu a Doblo?" = pergunta sobre ESTOQUE, NÃO é dado de troca!
- "Vocês já venderam?" = pergunta sobre estoque, NÃO indica troca
- "Vendeu aquele carro?" = pergunta sobre estoque
- "Já vendi MEU carro" = pode indicar que TEM troca
- "Tenho um Gol para trocar" = tem troca confirmado

has_trade_in = true APENAS SE:
- Cliente disse "tenho um carro para trocar"
- Cliente disse "dou meu carro na troca"
- Cliente disse "quero entregar meu [modelo]"
- Cliente disse "já vendi meu carro" (tinha troca, vendeu fora)

has_trade_in = false APENAS SE:
- Cliente disse "não tenho carro para trocar"
- Cliente disse "vou comprar à vista, sem troca"

Retorne um JSON com APENAS os campos que o CLIENTE DISSE EXPLICITAMENTE:
- vehicle_interest: string (APENAS se o cliente MENCIONOU um modelo/marca específica)
- budget: number (APENAS se o cliente disse "tenho X para gastar")
- down_payment: number (APENAS se o cliente disse valor de entrada)
- desired_installment: number (APENAS se o cliente disse valor de parcela)
- has_trade_in: boolean (APENAS se o cliente confirmou que tem ou não tem carro na troca - NÃO CONFUNDA com perguntas sobre estoque!)
- trade_in_vehicle: string (APENAS se o cliente disse qual carro dele tem para trocar)
- clean_credit: boolean (APENAS se o cliente confirmou nome limpo/sujo)
- cpf: string (APENAS se o cliente informou o CPF)

Se não encontrar NENHUMA informação concreta, retorne: {}

EXEMPLOS:
- Cliente: "oi" → {}
- Cliente: "tem carro bom?" → {}
- Cliente: "quero um Polo" → {"vehicle_interest": "Polo"}
- Cliente: "tem Civic 2020 por até 80 mil?" → {"vehicle_interest": "Civic 2020", "budget": 80000}
- Cliente: "já vendeu a Doblo?" → {} (é pergunta sobre ESTOQUE, não sobre troca!)
- Cliente: "tenho um Gol 2018 pra dar na troca" → {"has_trade_in": true, "trade_in_vehicle": "Gol 2018"}

Retorne APENAS o JSON, sem explicações.`
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      console.error('[Qualification] AI API error:', response.status);
      return {};
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let parsed: any = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('[Qualification] Failed to parse AI response:', e);
      return {};
    }
    
    // Build updates only for fields that have values
    const updates: Record<string, any> = {};
    
    if (parsed.vehicle_interest && typeof parsed.vehicle_interest === 'string') {
      updates.vehicle_interest = parsed.vehicle_interest;
    }
    if (parsed.budget && typeof parsed.budget === 'number') {
      updates.budget = parsed.budget;
    }
    if (parsed.down_payment && typeof parsed.down_payment === 'number') {
      updates.down_payment = parsed.down_payment;
    }
    if (parsed.desired_installment && typeof parsed.desired_installment === 'number') {
      updates.desired_installment = parsed.desired_installment;
    }
    if (parsed.has_trade_in !== undefined && typeof parsed.has_trade_in === 'boolean') {
      updates.has_trade_in = parsed.has_trade_in;
    }
    if (parsed.trade_in_vehicle && typeof parsed.trade_in_vehicle === 'string') {
      updates.trade_in_vehicle = parsed.trade_in_vehicle;
    }
    if (parsed.clean_credit !== undefined && typeof parsed.clean_credit === 'boolean') {
      updates.clean_credit = parsed.clean_credit;
    }
    if (parsed.cpf && typeof parsed.cpf === 'string') {
      updates.cpf = parsed.cpf.replace(/[^\d]/g, '');
    }
    
    console.log('[Qualification] AI extracted:', updates);
    return updates;
    
  } catch (e) {
    console.error('[Qualification] AI extraction error:', e);
    return {};
  }
}

// Transfer to salesperson after lead qualification (salesperson already assigned at creation)
async function assignSalespersonOnQualification(
  supabase: any,
  leadId: string
): Promise<{ id: string; name: string } | null> {
  console.log('[Qualification] Lead qualified! Transferring to pre-assigned salesperson...');

  // Get lead to find ALREADY ASSIGNED salesperson
  const { data: lead } = await supabase
    .from('leads')
    .select('assigned_to, name, phone, vehicle_interest')
    .eq('id', leadId)
    .single();

  let assignedTo = lead?.assigned_to;

  // Fallback: if somehow no salesperson was assigned, do it now
  if (!assignedTo) {
    console.log('[Qualification] No pre-assigned salesperson, assigning now via round-robin...');
    assignedTo = await getNextRoundRobinSalesperson(supabase);
    
    if (!assignedTo) {
      console.error('[Qualification] No salesperson available in round-robin');
      return null;
    }
    
    // Increment round-robin counters
    await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: assignedTo });
    
    // Update lead with assigned salesperson
    await supabase
      .from('leads')
      .update({ assigned_to: assignedTo })
      .eq('id', leadId);
    
    // Create lead assignment record
    await supabase.from('lead_assignments').insert({
      lead_id: leadId,
      salesperson_id: assignedTo,
      assignment_type: 'round_robin',
      notes: 'Atribuído na qualificação (fallback)',
    });
  }

  // Get salesperson details including phone for notification
  const { data: salesperson } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('id', assignedTo)
    .single();

  const salespersonName = salesperson?.full_name || 'Nosso atendente';
  console.log('[Qualification] Transferring to:', salespersonName, '(', assignedTo, ')');

  // Update lead status to qualified
  await supabase
    .from('leads')
    .update({ qualification_status: 'qualificado' })
    .eq('id', leadId);

  // Update negotiation from atendimento_ia → negociando

  // Update negotiation from atendimento_ia → negociando (salesperson already set)
  await supabase
    .from('negotiations')
    .update({
      status: 'negociando',
      last_message_at: new Date().toISOString(),
      notes: 'Lead qualificado pelo bot - transferido ao vendedor',
    })
    .eq('lead_id', leadId);

  // Get qualification data for notification
  const { data: qualData } = await supabase
    .from('lead_qualification_data')
    .select('vehicle_interest, budget, down_payment, desired_installment, clean_credit, cpf')
    .eq('lead_id', leadId)
    .single();

  // Create notification for assigned salesperson
  await supabase.from('notifications').insert({
    user_id: assignedTo,
    type: 'lead_qualified',
    title: '🔥 Lead Qualificado pelo Bot!',
    message: `${lead?.name || 'Novo lead'} foi qualificado! Veículo: ${qualData?.vehicle_interest || 'Não informado'}. Orçamento: R$ ${qualData?.budget?.toLocaleString('pt-BR') || 'Não informado'}`,
    link: '/crm',
  });

  console.log('[Qualification] Notification created for salesperson:', assignedTo);

  // Send WhatsApp notification to salesperson if they have a phone registered
  if (salesperson?.phone) {
    await sendWhatsAppToSalesperson(supabase, salesperson.phone, lead, qualData);
  } else {
    console.log('[Qualification] Salesperson has no phone registered, skipping WhatsApp notification');
  }

  return { id: assignedTo, name: salespersonName };
}

// Send WhatsApp notification to salesperson with lead qualification details
async function sendWhatsAppToSalesperson(
  supabase: any,
  salespersonPhone: string,
  lead: { name?: string; phone?: string } | null,
  qualData: { 
    vehicle_interest?: string; 
    budget?: number; 
    down_payment?: number; 
    desired_installment?: number;
    clean_credit?: boolean;
    cpf?: string;
  } | null
): Promise<void> {
  try {
    console.log('[Notification] Sending WhatsApp to salesperson:', salespersonPhone);

    // Get a connected WhatsApp instance
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('status', 'connected')
      .limit(1)
      .single();

    if (!instance) {
      console.log('[Notification] No WhatsApp instance available for salesperson notification');
      return;
    }

    // Format salesperson phone
    let formattedPhone = salespersonPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    // Format lead phone for WhatsApp link
    let leadPhoneFormatted = (lead?.phone || '').replace(/\D/g, '');
    if (leadPhoneFormatted && !leadPhoneFormatted.startsWith('55')) {
      leadPhoneFormatted = '55' + leadPhoneFormatted;
    }
    const whatsappLink = leadPhoneFormatted ? `wa.me/${leadPhoneFormatted}` : 'Não informado';

    // Fetch suggested vehicles from inventory based on client interest
    const vehicleSuggestions = await getVehicleSuggestions(supabase, qualData?.vehicle_interest, qualData?.budget);

    // Build qualification card message
    const formatCurrency = (value?: number) => {
      if (!value) return 'Não informado';
      return `R$ ${value.toLocaleString('pt-BR')}`;
    };

    // Build suggestions section
    let suggestionsSection = '';
    if (vehicleSuggestions.length > 0) {
      suggestionsSection = `

━━━━━━━━━━━━━━━━━━━━━
💡 *DICA: VEÍCULOS NO ESTOQUE*
_Modelos similares que podem interessar:_

${vehicleSuggestions.map((v, i) => `${i + 1}. *${v.brand} ${v.model}* ${v.year_model}
   ${formatCurrency(v.sale_price)} • ${v.km?.toLocaleString('pt-BR') || '0'} km`).join('\n\n')}

_Use essas opções para negociar!_`;
    }

    const fichaMensagem = `🔥 *LEAD QUENTE - AÇÃO IMEDIATA*

━━━━━━━━━━━━━━━━━━━━━
👤 *${lead?.name || 'Cliente'}*
📱 ${whatsappLink}
━━━━━━━━━━━━━━━━━━━━━

💰 *PERFIL FINANCEIRO*
• Orçamento: ${formatCurrency(qualData?.budget)}
• Entrada: ${formatCurrency(qualData?.down_payment)}
• Parcela: ${formatCurrency(qualData?.desired_installment)}/mês
• Crédito: ${qualData?.clean_credit === true ? '✅ Aprovado' : qualData?.clean_credit === false ? '❌ Restrição' : '⏳ Verificar'}

🚗 *INTERESSE*
${qualData?.vehicle_interest || 'Não especificado'}

📋 CPF: ${qualData?.cpf || 'Não informado'}${suggestionsSection}

━━━━━━━━━━━━━━━━━━━━━
⚡ *Qualificado agora - Seja o primeiro!*`;

    // Send via Evolution API
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')?.replace(/\/$/, '');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionUrl || !evolutionKey) {
      console.error('[Notification] Missing Evolution API credentials');
      return;
    }

    const sendUrl = `${evolutionUrl}/message/sendText/${instance.instance_name}`;
    
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: fichaMensagem,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notification] Failed to send WhatsApp to salesperson:', errorText);
      return;
    }

    console.log('[Notification] WhatsApp sent successfully to salesperson:', formattedPhone);
  } catch (error) {
    console.error('[Notification] Error sending WhatsApp to salesperson:', error);
  }
}

// Get vehicle suggestions from inventory based on client interest
// Search vehicles using RAG (semantic search via pgvector)
async function searchVehiclesWithRAG(query: string): Promise<{ vehicles: any[]; query_info: any }> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('[RAG] No LOVABLE_API_KEY, skipping RAG search');
    return { vehicles: [], query_info: null };
  }
  
  try {
    // Generate embedding for the query
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('[RAG] Embedding error:', await embeddingResponse.text());
      return { vehicles: [], query_info: null };
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    
    if (!queryEmbedding) {
      return { vehicles: [], query_info: null };
    }

    // Extract year from query
    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    const extractedYear = yearMatch ? parseInt(yearMatch[0]) : null;

    // Call Supabase RPC for vector search
    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '');
    
    const { data: searchResults, error } = await supabase
      .rpc('search_similar_vehicles', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        year_tolerance: 2,
        target_year: extractedYear
      });

    if (error) {
      console.error('[RAG] Search error:', error);
      return { vehicles: [], query_info: null };
    }

    if (!searchResults || searchResults.length === 0) {
      return { vehicles: [], query_info: { extracted_year: extractedYear } };
    }

    // Get full vehicle details
    const vehicleIds = searchResults.map((r: any) => r.vehicle_id);
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, images')
      .in('id', vehicleIds)
      .eq('status', 'disponivel');

    // Merge with similarity scores
    const vehiclesWithScores = (vehicles || []).map((v: any) => {
      const sr = searchResults.find((r: any) => r.vehicle_id === v.id);
      return { ...v, similarity: sr?.similarity || 0 };
    }).sort((a: any, b: any) => b.similarity - a.similarity).slice(0, 5);

    const hasExactYearMatch = extractedYear && vehiclesWithScores.some((v: any) => 
      v.year_model === extractedYear || v.year_fabrication === extractedYear
    );

    return {
      vehicles: vehiclesWithScores,
      query_info: {
        extracted_year: extractedYear,
        has_exact_year_match: hasExactYearMatch,
      }
    };
  } catch (error) {
    console.error('[RAG] Error:', error);
    return { vehicles: [], query_info: null };
  }
}

async function getVehicleSuggestions(
  supabase: any,
  vehicleInterest?: string,
  budget?: number
): Promise<Array<{ brand: string; model: string; year_model: number; sale_price: number; km: number }>> {
  try {
    if (!vehicleInterest) return [];

    // Extract brand/model keywords from interest
    const keywords = vehicleInterest.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    
    // Build query for available vehicles
    let query = supabase
      .from('vehicles')
      .select('brand, model, year_model, sale_price, km')
      .eq('status', 'disponivel')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: vehicles, error } = await query;

    if (error || !vehicles) {
      console.log('[Suggestions] Error fetching vehicles:', error);
      return [];
    }

    // Score and filter vehicles based on interest match
    const scoredVehicles = vehicles.map((v: any) => {
      const vehicleText = `${v.brand} ${v.model}`.toLowerCase();
      let score = 0;
      
      // Match keywords
      for (const keyword of keywords) {
        if (vehicleText.includes(keyword)) {
          score += 10;
        }
      }
      
      // Budget proximity bonus (within 20% of budget)
      if (budget && v.sale_price) {
        const priceDiff = Math.abs(v.sale_price - budget) / budget;
        if (priceDiff <= 0.2) {
          score += 5;
        } else if (priceDiff <= 0.4) {
          score += 2;
        }
      }
      
      return { ...v, score };
    });

    // Sort by score and return top 3
    const suggestions = scoredVehicles
      .filter((v: any) => v.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    // If no matches, return vehicles within budget range
    if (suggestions.length === 0 && budget) {
      const budgetMatches = vehicles
        .filter((v: any) => v.sale_price && v.sale_price <= budget * 1.2 && v.sale_price >= budget * 0.7)
        .slice(0, 3);
      return budgetMatches;
    }

    return suggestions;
  } catch (error) {
    console.error('[Suggestions] Error getting vehicle suggestions:', error);
    return [];
  }
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
