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
  
  // ===== ESTRATÉGIA UNIVERSAL: Buscar modelos/marcas DINAMICAMENTE do banco =====
  // PASSO 1: Buscar todos os modelos e marcas do estoque para criar lista dinâmica
  const { data: stockModels } = await supabase
    .from('vehicles')
    .select('brand, model')
    .eq('status', 'disponivel');
  
  // Criar set de keywords dinâmico baseado no estoque REAL
  const dynamicKeywords = new Set<string>();
  
  // Keywords genéricas (sempre ativas)
  const genericKeywords = [
    'carro', 'veículo', 'veiculo', 'modelo', 'marca', 'ano', 'preço', 'preco', 
    'estoque', 'disponível', 'disponivel', 'foto', 'fotos', 'imagem', 'ver',
    'sedan', 'hatch', 'suv', 'pickup', 'caminhonete', 'crossover', 'minivan',
    'barato', 'econômico', 'popular', 'automático', 'manual', 'flex', 'diesel',
    'quanto', 'valor', 'tem', 'têm', 'vendeu', 'ainda', 'sobrou',
    // ===== NOVO: Keywords para busca por PREÇO =====
    'mil', 'reais', 'orçamento', 'orcamento', 'budget', 'faixa', 'entre', 'partir'
  ];
  genericKeywords.forEach(k => dynamicKeywords.add(k));
  
  // Adicionar TODAS as marcas e modelos do estoque REAL
  if (stockModels) {
    stockModels.forEach((v: any) => {
      if (v.brand) {
        dynamicKeywords.add(v.brand.toLowerCase().trim());
        // Adicionar variações comuns
        if (v.brand.toLowerCase() === 'volkswagen') dynamicKeywords.add('vw');
        if (v.brand.toLowerCase() === 'chevrolet') dynamicKeywords.add('gm');
        if (v.brand.toLowerCase() === 'citroën') dynamicKeywords.add('citroen');
      }
      if (v.model) {
        // Adicionar modelo e variações
        const model = v.model.toLowerCase().trim();
        dynamicKeywords.add(model);
        // Sem espaços
        dynamicKeywords.add(model.replace(/\s+/g, ''));
        // Com hífen
        dynamicKeywords.add(model.replace(/\s+/g, '-'));
        // Cada palavra do modelo (para "t cross" -> "t", "cross")
        model.split(/\s+/).forEach((word: string) => {
          if (word.length > 1) dynamicKeywords.add(word);
        });
      }
    });
  }
  
  console.log('[RAG] Dynamic keywords from stock:', dynamicKeywords.size, 'terms');
  
  // Verificar se a mensagem contém qualquer termo do estoque
  const messageLower = actualMessage.toLowerCase();
  
  // ===== NOVO: Detectar busca por FAIXA DE PREÇO =====
  const pricePatterns = [
    /(?:até|ate|max|máximo|maximo)\s*(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:mil|k)?/i,
    /(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:mil|k)/i,
    /(?:carro|veículo|veiculo).{0,20}(\d+)\s*(?:mil|k)/i,
    /(\d+)\s*(?:mil|k).{0,10}(?:carro|veículo|veiculo)/i,
  ];
  
  let extractedMaxPrice: number | null = null;
  for (const pattern of pricePatterns) {
    const priceMatch = messageLower.match(pattern);
    if (priceMatch) {
      let priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
      let price = parseFloat(priceStr);
      if (messageLower.includes('mil') || messageLower.includes('k')) {
        price *= 1000;
      }
      extractedMaxPrice = price;
      console.log('[RAG] Extracted price from message:', extractedMaxPrice);
      break;
    }
  }
  
  // ===== FUNÇÃO DE CATEGORIZAÇÃO CENTRALIZADA =====
  // Esta função é usada TANTO no filtro de banco quanto no prompt
  function getVehicleCategory(model: string, version: string = ''): string {
    const modelLower = (model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const versionLower = (version || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fullName = `${modelLower} ${versionLower}`;
    
    // PERUA / WAGON - DEVE VIR ANTES de Hatch para evitar falso positivo com "fox"
    if (/spacefox|crossfox|parati|variant|weekend|fielder|airwave|fit\s*aria|accord\s*wagon|golf\s*variant|passat\s*variant|megane\s*grand\s*tour|scenic|livina|grand\s*livina|idea\s*adventure|doblo/.test(fullName)) {
      return 'Perua';
    }
    
    // MINIVAN / MPV
    if (/spin|zafira|meriva|livina|grand\s*livina|picasso|xsara|c4\s*picasso|c3\s*picasso|scenic|kangoo|partner|berlingo|doblo|fiorino|strada\s*adventure/.test(fullName)) {
      return 'Minivan';
    }
    
    // SUV / Crossover
    if (/tracker|creta|compass|renegade|captur|kicks|hrv|hr-v|tcross|t-cross|ecosport|duster|tucson|sportage|rav4|cx5|cx-5|tiguan|trailblazer|sw4|jimny|vitara|tiggo|caoa|chery|haval|jac|cherry|ix35|santa\s*fe|sorento|outlander|asx|xtrail|x-trail|equinox|edge|territory|bronco|defender|discovery|evoque|velar|q3|q5|q7|x1|x3|x5|glb|glc|gle|xc40|xc60|xc90|2008|3008|5008|cx3|cx30|cx50|seltos|soul|niro|stonic|nivus|taos|atlas/.test(fullName)) {
      return 'SUV';
    }
    
    // Hatch / Compacto - SEM "fox" genérico, usa padrões específicos
    if (/^onix$|^gol$|^polo$|^hb20$|^sandero$|^ka$|^fiesta$|^up$|^etios$|^fit$|^march$|^mobi$|^kwid$|^argo$|^cronos$|^golf$|^i30$|^a3$|^serie1$|^118$|^120$|^a1$|^yaris$|^swift$|^rio$|^clio$|^c3$|^208$|^punto$|^bravo$|^stilo$|^palio$|^uno$|^celta$|^corsa$|^astra$|^focus$|^picanto$|^cielo$|^307$/.test(modelLower)) {
      return 'Hatch';
    }
    
    // Picape / Utilitário
    if (/hilux|ranger|s10|s-10|frontier|amarok|toro|oroch|montana|saveiro|strada|l200|triton|tacoma|ram|f250|f-250|silverado|maverick/.test(fullName)) {
      return 'Picape';
    }
    
    // Sedan - lista explícita
    if (/civic|corolla|cruze|jetta|sentra|city|fluence|virtus|voyage|prisma|versa|cobalt|onix\s*plus|hb20s|logan|siena|linea|cerato|elantra|fusion|passat|a4|serie3|320|c180|c200|c250/.test(fullName)) {
      return 'Sedan';
    }
    
    // Verificar na versão se menciona "sedan"
    if (/sedan/i.test(version)) {
      return 'Sedan';
    }
    
    return 'Outros';
  }
  
  // ===== DETECTAR CATEGORIA NA MENSAGEM =====
  let requestedCategory: string | null = null;
  const categoryPatterns: [RegExp, string][] = [
    [/\bsed[aã]n?s?\b/i, 'Sedan'],
    [/\bsuv[s]?\b/i, 'SUV'],
    [/\bhatch[s]?(?:back)?\b/i, 'Hatch'],
    [/\bpicape[s]?\b|\bpick\s*up[s]?\b|\bcaminhonete[s]?\b/i, 'Picape'],
    [/\bperua[s]?\b|\bwagon[s]?\b|\bstation\s*wagon[s]?\b/i, 'Perua'],
    [/\bminivan[s]?\b|\bmpv[s]?\b/i, 'Minivan'],
  ];
  
  for (const [pattern, category] of categoryPatterns) {
    if (pattern.test(messageLower)) {
      requestedCategory = category;
      console.log('[RAG] Detected category request:', requestedCategory);
      break;
    }
  }
  
  // Se detectou preço OU categoria, forçar busca por veículos
  const hasPriceIntent = extractedMaxPrice !== null;
  const hasCategoryIntent = requestedCategory !== null;
  const messageHasVehicleIntent = Array.from(dynamicKeywords).some(k => messageLower.includes(k));
  
  // IMPORTANTE: Se detectou categoria, também é um intent de veículo!
  const shouldSearchVehicles = messageHasVehicleIntent || hasPriceIntent || hasCategoryIntent;
  
  console.log('[RAG] Vehicle intent detected:', messageHasVehicleIntent, '| Category intent:', hasCategoryIntent, '| Price intent:', hasPriceIntent);
  
  // Criar listas de modelos e marcas únicas do estoque (usado em múltiplos lugares)
  const modelList: string[] = stockModels?.map((v: any) => v.model?.toLowerCase().trim()).filter(Boolean) || [];
  const brandList: string[] = stockModels?.map((v: any) => v.brand?.toLowerCase().trim()).filter(Boolean) || [];
  const uniqueModels: string[] = [...new Set(modelList)].filter((m: string) => m && m.length > 1);
  const uniqueBrands: string[] = [...new Set(brandList)].filter((b: string) => b && b.length > 1);

  // ===== PASSO EXTRA: Buscar veículos mencionados no histórico da conversa =====
  // Isso garante que quando o cliente pergunta "foto do painel", pegamos o veículo que estava discutindo
  let vehiclesFromHistory: any[] = [];
  if (history.length > 0) {
    // Combinar histórico em um texto para buscar menções de veículos
    const historyText = history.map((m: any) => m.content).join(' ').toLowerCase();
    
    // Procurar por modelos mencionados no histórico
    for (const model of uniqueModels) {
      const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const modelRegex = new RegExp(escapedModel.replace(/\s+/g, '\\s*'), 'i');
      if (modelRegex.test(historyText)) {
        // Buscar esse veículo
        const { data: histVehicles } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
          .eq('status', 'disponivel')
          .ilike('model', `%${model}%`)
          .limit(3);
        
        if (histVehicles && histVehicles.length > 0) {
          vehiclesFromHistory.push(...histVehicles.map((v: any) => ({ ...v, similarity: 0.95, from_history: true })));
          console.log('[RAG] Found vehicle from history:', model);
        }
      }
    }
    
    // Remover duplicatas
    const uniqueHistIds = new Set<string>();
    vehiclesFromHistory = vehiclesFromHistory.filter((v: any) => {
      if (uniqueHistIds.has(v.id)) return false;
      uniqueHistIds.add(v.id);
      return true;
    });
    
    console.log('[RAG] Vehicles from conversation history:', vehiclesFromHistory.length);
  }

  // ===== BUSCA DE VEÍCULOS: Por keyword, preço OU categoria =====
  // CORRIGIDO: Busca SEMPRE é ativada quando há qualquer menção a veículo ou pergunta sobre estoque
  const shouldAlwaysSearch = messageLower.includes('tem') || messageLower.includes('quero') || 
                              messageLower.includes('procuro') || messageLower.includes('busco') ||
                              messageLower.includes('carro') || messageLower.includes('veículo') ||
                              messageLower.includes('disponível') || messageLower.includes('estoque');
  
  if (shouldSearchVehicles || shouldAlwaysSearch) {
    console.log('[RAG] Search triggered. Keyword intent:', messageHasVehicleIntent, '| Price:', hasPriceIntent, '| Category:', hasCategoryIntent, '| Always search:', shouldAlwaysSearch);
    console.log('[RAG] Requested category:', requestedCategory, '| Extracted price:', extractedMaxPrice);
    console.log('[RAG] Message:', actualMessage.substring(0, 100));
    
    // PASSO 2: Tentar RAG semântico primeiro
    try {
      const ragResponse = await searchVehiclesWithRAG(actualMessage);
      if (ragResponse.vehicles && ragResponse.vehicles.length > 0) {
        relevantVehicles = ragResponse.vehicles;
        ragQueryInfo = ragResponse.query_info;
        console.log('[RAG] Semantic search found', relevantVehicles.length, 'vehicles with scores:', 
          ragResponse.vehicles.map((v: any) => `${v.model}:${(v.similarity * 100).toFixed(0)}%`).join(', '));
      } else {
        console.log('[RAG] Semantic search returned empty, will use fallback');
      }
    } catch (ragError) {
      console.error('[RAG] Search error:', ragError);
    }
    
    // ===== PASSO 2.5: BUSCA DIRETA POR PREÇO (quando detectado) =====
    // IMPORTANTE: Para busca por preço, precisamos mostrar MAIS opções já que é uma busca aberta
    // NOVO: Se detectou categoria, filtrar os veículos no lado do servidor
    if (hasPriceIntent && extractedMaxPrice) {
      console.log('[RAG] Searching by price range: até R$', extractedMaxPrice, '| Category filter:', requestedCategory);
      
      // Buscar veículos dentro da faixa de preço - LIMITE AUMENTADO para 30 para poder filtrar depois
      const { data: allVehiclesByPrice } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .lte('sale_price', extractedMaxPrice)
        .order('sale_price', { ascending: false }) // Mais caros primeiro (perto do budget)
        .limit(50); // Buscar mais para poder filtrar por categoria
      
      console.log('[RAG] Found', allVehiclesByPrice?.length || 0, 'vehicles within budget');
      
      // ===== APLICAR FILTRO DE CATEGORIA SE ESPECIFICADO =====
      let vehiclesByPrice = allVehiclesByPrice || [];
      let totalInCategory = 0;
      let totalInBudget = allVehiclesByPrice?.length || 0;
      
      if (requestedCategory && vehiclesByPrice.length > 0) {
        console.log('[RAG] Filtering by category:', requestedCategory);
        vehiclesByPrice = vehiclesByPrice.filter((v: any) => {
          const vCategory = getVehicleCategory(v.model || '', v.version || '');
          console.log(`[RAG] Vehicle ${v.model} categorized as: ${vCategory}`);
          return vCategory === requestedCategory;
        });
        totalInCategory = vehiclesByPrice.length;
        console.log('[RAG] After category filter:', vehiclesByPrice.length, 'vehicles');
        
        // Se não encontrou nenhum da categoria, informar
        if (vehiclesByPrice.length === 0) {
          ragQueryInfo = {
            ...ragQueryInfo,
            no_vehicles_in_category: true,
            requested_category: requestedCategory,
            max_price: extractedMaxPrice,
            total_in_budget_all_categories: totalInBudget
          };
        }
      }
      
      // Limitar a 15 para não sobrecarregar o prompt
      vehiclesByPrice = vehiclesByPrice.slice(0, 15);
      
      if (vehiclesByPrice.length > 0) {
        // Para busca por preço PURO (sem modelo), substituir resultados existentes
        if (!messageHasVehicleIntent) {
          relevantVehicles = []; // Limpar resultados anteriores, priorizar preço
        }
        
        const existingIds = new Set(relevantVehicles.map((v: any) => v.id));
        vehiclesByPrice.forEach((v: any) => {
          if (!existingIds.has(v.id)) {
            const category = getVehicleCategory(v.model || '', v.version || '');
            relevantVehicles.push({ ...v, similarity: 0.95, from_price_search: true, vehicle_category: category });
            existingIds.add(v.id);
          }
        });
        console.log('[RAG] Price search added', vehiclesByPrice.length, 'vehicles');
        
        // Adicionar informação de quantos veículos existem no total
        ragQueryInfo = {
          ...ragQueryInfo,
          total_vehicles_in_budget: totalInBudget,
          total_in_category: requestedCategory ? totalInCategory : undefined,
          requested_category: requestedCategory,
          shown_vehicles: vehiclesByPrice.length,
          max_price: extractedMaxPrice
        };
      } else if (!requestedCategory) {
        // Se não encontrou dentro do orçamento E não tinha filtro de categoria, buscar os mais baratos
        console.log('[RAG] No vehicles within R$', extractedMaxPrice, '- finding cheapest options');
        const { data: cheapestVehicles } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
          .eq('status', 'disponivel')
          .order('sale_price', { ascending: true }) // Mais baratos primeiro
          .limit(10);
        
        if (cheapestVehicles && cheapestVehicles.length > 0) {
          relevantVehicles = []; // Limpar e usar apenas os mais baratos
          cheapestVehicles.forEach((v: any) => {
            const category = getVehicleCategory(v.model || '', v.version || '');
            relevantVehicles.push({ ...v, similarity: 0.7, cheapest_option: true, vehicle_category: category });
          });
          console.log('[RAG] Added cheapest vehicles as alternatives');
          
          ragQueryInfo = {
            ...ragQueryInfo,
            no_vehicles_in_budget: true,
            max_price_requested: extractedMaxPrice,
            cheapest_shown: true
          };
        }
      }
    }
    
    // ===== PASSO 2.6: BUSCA DIRETA POR CATEGORIA (quando categoria especificada sem preço) =====
    // Se o cliente perguntou por uma categoria específica (ex: "tem sedan?", "quero um SUV")
    // mas NÃO especificou preço, fazer busca dedicada por categoria
    if (requestedCategory && !hasPriceIntent && relevantVehicles.length === 0) {
      console.log('[RAG] Category-only search for:', requestedCategory);
      
      // Buscar TODOS os veículos disponíveis e filtrar por categoria
      const { data: allAvailableVehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .order('sale_price', { ascending: true })
        .limit(100); // Buscar mais para filtrar
      
      if (allAvailableVehicles && allAvailableVehicles.length > 0) {
        // Filtrar por categoria no servidor
        const vehiclesInCategory = allAvailableVehicles.filter((v: any) => {
          const vCategory = getVehicleCategory(v.model || '', v.version || '');
          return vCategory === requestedCategory;
        });
        
        console.log('[RAG] Found', vehiclesInCategory.length, 'vehicles in category', requestedCategory);
        
        if (vehiclesInCategory.length > 0) {
          // Limitar a 15 para não sobrecarregar
          const limitedVehicles = vehiclesInCategory.slice(0, 15);
          limitedVehicles.forEach((v: any) => {
            const category = getVehicleCategory(v.model || '', v.version || '');
            relevantVehicles.push({ 
              ...v, 
              similarity: 0.95, 
              from_category_search: true, 
              vehicle_category: category 
            });
          });
          
          ragQueryInfo = {
            ...ragQueryInfo,
            category_search: true,
            requested_category: requestedCategory,
            total_in_category: vehiclesInCategory.length,
            shown_vehicles: limitedVehicles.length
          };
        } else {
          // Nenhum veículo da categoria - informar e mostrar alternativas
          console.log('[RAG] No vehicles found in category', requestedCategory);
          ragQueryInfo = {
            ...ragQueryInfo,
            no_vehicles_in_category: true,
            requested_category: requestedCategory,
            total_available: allAvailableVehicles.length
          };
          
          // Mostrar alguns veículos disponíveis como alternativa
          const alternativeVehicles = allAvailableVehicles.slice(0, 5);
          alternativeVehicles.forEach((v: any) => {
            const category = getVehicleCategory(v.model || '', v.version || '');
            relevantVehicles.push({ 
              ...v, 
              similarity: 0.5, 
              alternative_option: true, 
              vehicle_category: category 
            });
          });
        }
      }
    }
    
    // ===== PASSO 2.7: BUSCA COMBINADA CATEGORIA + PREÇO =====
    // Quando tem categoria E preço, garantir que a busca considera ambos
    if (requestedCategory && hasPriceIntent && extractedMaxPrice && relevantVehicles.length === 0) {
      console.log('[RAG] Combined category + price search for:', requestedCategory, 'até R$', extractedMaxPrice);
      
      const { data: allInBudget } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .lte('sale_price', extractedMaxPrice)
        .order('sale_price', { ascending: false })
        .limit(100);
      
      if (allInBudget && allInBudget.length > 0) {
        const vehiclesInCategoryAndBudget = allInBudget.filter((v: any) => {
          const vCategory = getVehicleCategory(v.model || '', v.version || '');
          return vCategory === requestedCategory;
        });
        
        console.log('[RAG] Found', vehiclesInCategoryAndBudget.length, 'vehicles in category', requestedCategory, 'within budget');
        
        if (vehiclesInCategoryAndBudget.length > 0) {
          const limitedVehicles = vehiclesInCategoryAndBudget.slice(0, 15);
          limitedVehicles.forEach((v: any) => {
            const category = getVehicleCategory(v.model || '', v.version || '');
            relevantVehicles.push({ 
              ...v, 
              similarity: 0.95, 
              from_combined_search: true, 
              vehicle_category: category 
            });
          });
        }
      }
    }
    
    // PASSO 3: BUSCA DIRETA - Extrair termos e buscar no banco
    // Procurar por modelos na mensagem
    const foundModelTerms: string[] = [];
    const foundBrandTerms: string[] = [];
    
    for (const model of uniqueModels) {
      // Escape regex special chars
      const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const modelRegex = new RegExp(escapedModel.replace(/\s+/g, '\\s*'), 'i');
      if (modelRegex.test(messageLower)) {
        foundModelTerms.push(model);
      }
    }
    
    for (const brand of uniqueBrands) {
      if (messageLower.includes(brand)) {
        foundBrandTerms.push(brand);
      }
    }
    
    console.log('[RAG] Found terms - Models:', foundModelTerms, 'Brands:', foundBrandTerms);
    
    // PASSO 4: Se RAG não achou ou achou poucos, busca DIRETA complementar
    // OTIMIZAÇÃO: Reduzir limites para evitar sobrecarga de contexto
    if (relevantVehicles.length < 3 && foundModelTerms.length > 0) {
      // Buscar por modelo - LIMITE REDUZIDO
      for (const term of foundModelTerms) {
        if (relevantVehicles.length >= 5) break; // MAX 5 veículos total
        
        const { data: vehiclesByModel } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
          .eq('status', 'disponivel')
          .ilike('model', `%${term}%`)
          .limit(3);
        
        if (vehiclesByModel && vehiclesByModel.length > 0) {
          // Adicionar sem duplicar
          const existingIds = new Set(relevantVehicles.map((v: any) => v.id));
          vehiclesByModel.forEach((v: any) => {
            if (!existingIds.has(v.id)) {
              relevantVehicles.push({ ...v, similarity: 0.9 });
              existingIds.add(v.id);
            }
          });
          console.log('[RAG] Direct model search added vehicles for:', term);
        }
      }
    }
    
    // Buscar por marca - LIMITE REDUZIDO
    if (relevantVehicles.length < 3 && foundBrandTerms.length > 0) {
      for (const term of foundBrandTerms) {
        if (relevantVehicles.length >= 5) break; // MAX 5 veículos total
        
        const { data: vehiclesByBrand } = await supabase
          .from('vehicles')
          .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
          .eq('status', 'disponivel')
          .ilike('brand', `%${term}%`)
          .limit(3);
        
        if (vehiclesByBrand && vehiclesByBrand.length > 0) {
          const existingIds = new Set(relevantVehicles.map((v: any) => v.id));
          vehiclesByBrand.forEach((v: any) => {
            if (!existingIds.has(v.id)) {
              relevantVehicles.push({ ...v, similarity: 0.7 });
              existingIds.add(v.id);
            }
          });
          console.log('[RAG] Direct brand search added vehicles for:', term);
        }
      }
    }
    
    // PASSO 5: Se ainda não encontrou nada, buscar amostra MAIOR do estoque
    // CORRIGIDO: Agora sempre injeta veículos para a IA poder responder sobre o estoque
    if (relevantVehicles.length === 0) {
      console.log('[RAG] No specific matches - fetching inventory sample');
      const { data: sampleVehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
        .eq('status', 'disponivel')
        .order('sale_price', { ascending: true })  // Mais baratos primeiro
        .limit(10);  // Aumentado de 5 para 10
      
      if (sampleVehicles) {
        relevantVehicles = sampleVehicles.map((v: any) => ({ 
          ...v, 
          similarity: 0.5,  // Aumentado de 0.3 para 0.5
          from_fallback: true 
        }));
        console.log('[RAG] Added', relevantVehicles.length, 'fallback vehicles from inventory');
      }
    }
  } else {
    // NOVO: Mesmo sem intent detectado, sempre injeta alguns veículos populares
    console.log('[RAG] No explicit vehicle intent, but injecting popular vehicles for context');
    const { data: popularVehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, images')
      .eq('status', 'disponivel')
      .order('sale_price', { ascending: true })
      .limit(5);
    
    if (popularVehicles) {
      relevantVehicles = popularVehicles.map((v: any) => ({ 
        ...v, 
        similarity: 0.3,
        from_context_injection: true 
      }));
    }
  }
  
  // ===== PASSO 6: Mesclar veículos do histórico (prioridade máxima) =====
  // Adicionar veículos do histórico no INÍCIO para que a IA os veja primeiro
  if (vehiclesFromHistory.length > 0) {
    const existingIds = new Set(relevantVehicles.map((v: any) => v.id));
    const newFromHistory = vehiclesFromHistory.filter((v: any) => !existingIds.has(v.id));
    relevantVehicles = [...newFromHistory, ...relevantVehicles];
    console.log('[RAG] Added', newFromHistory.length, 'vehicles from history to context');
  }
  
  // ===== PASSO 7: IDENTIFICAR VEÍCULO ATIVO DA CONVERSA =====
  // Esta é a chave para responder corretamente a "foto do painel" sem especificar o carro
  let activeVehicle: any = null;
  
  if (history.length > 0 && relevantVehicles.length > 0) {
    // Percorrer histórico do mais recente para o mais antigo
    for (let i = history.length - 1; i >= 0 && !activeVehicle; i--) {
      const msg = history[i];
      const msgLower = msg.content?.toLowerCase() || '';
      
      // Procurar menção de veículo específico
      for (const vehicle of relevantVehicles) {
        const modelLower = vehicle.model?.toLowerCase() || '';
        const brandLower = vehicle.brand?.toLowerCase() || '';
        
        // Verificar se modelo foi mencionado nesta mensagem
        if (modelLower.length > 2 && msgLower.includes(modelLower)) {
          activeVehicle = vehicle;
          console.log('[Active Vehicle] Found from history:', vehicle.brand, vehicle.model, '(from message', i, ')');
          break;
        }
        // Verificar marca + modelo junto
        if (brandLower && modelLower && 
            (msgLower.includes(brandLower) || msgLower.includes(modelLower))) {
          activeVehicle = vehicle;
          console.log('[Active Vehicle] Found brand/model match:', vehicle.brand, vehicle.model);
          break;
        }
      }
    }
    
    // Se não encontrou no histórico mas temos veículo do histórico com alta relevância, usar ele
    if (!activeVehicle && vehiclesFromHistory.length > 0) {
      activeVehicle = vehiclesFromHistory[0];
      console.log('[Active Vehicle] Using first from history:', activeVehicle.brand, activeVehicle.model);
    }
  }
  
  // ===== PASSO 8: CORTAR VEÍCULOS PARA MÁXIMO 5 (evitar sobrecarga) =====
  // Se temos veículo ativo, ele fica em primeiro + 4 outros
  if (activeVehicle) {
    const otherVehicles = relevantVehicles.filter((v: any) => v.id !== activeVehicle.id).slice(0, 4);
    relevantVehicles = [activeVehicle, ...otherVehicles];
    console.log('[Context] Active vehicle prioritized, total:', relevantVehicles.length);
  } else {
    // Ordenar por similaridade e cortar
    relevantVehicles = relevantVehicles
      .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 5);
    console.log('[Context] Top 5 by similarity selected');
  }
  
  // Log final
  console.log('[AI Agent] Universal search complete:', relevantVehicles.length, 'vehicles (max 5)');
  console.log('[AI Agent] Active vehicle:', activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : 'NONE');
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

===== ⛔ REGRAS OBRIGATÓRIAS - FALHAR AQUI É INACEITÁVEL =====

🧠 ANTES DE RESPONDER SOBRE QUALQUER VEÍCULO, FAÇA ISSO:

1. LEIA a seção "VEÍCULOS SUGERIDOS" que aparece mais abaixo neste prompt
2. PROCURE o modelo E o ano que o cliente mencionou
3. RESPONDA baseado SOMENTE no que está na lista

📋 REGRA DE OURO:
   SE o veículo (modelo+ano) ESTÁ NA LISTA → "Sim! Temos!" + dados exatos
   SE o veículo NÃO ESTÁ NA LISTA → "Esse modelo/ano não está no estoque"

❌ ERROS GRAVES (NUNCA FAÇA ISSO):
   - Dizer "não temos" E depois sugerir O MESMO carro
   - Dizer "foi vendido" sem ter essa informação
   - Dizer "não está disponível" para um carro que ESTÁ na lista
   - Inventar preços, anos ou características

===== 💰 REGRAS DE BUSCA POR PREÇO (CRÍTICO!) =====

Quando o cliente perguntar por FAIXA DE PREÇO (ex: "até 40 mil", "carro de 30 mil"):

1. OLHE a lista de veículos fornecida - eles JÁ ESTÃO filtrados por preço!
2. SE TEM veículos na lista dentro do orçamento:
   ✅ "Temos sim opções nessa faixa! Por exemplo: [citar 2-3 veículos com preço]"
   
3. SE NÃO TEM veículos no orçamento mas tem opções próximas:
   ✅ "Nessa faixa exata não temos no momento, mas temos opções a partir de R$ [preço do mais barato]. Posso te mostrar?"

4. NUNCA diga "não temos nessa faixa" se a lista mostra veículos dentro do orçamento!

📌 EXEMPLO CORRETO:
Cliente: "Tem algum carro até 40 mil?"
Lista mostra: Cielo R$ 22.990, Picanto R$ 25.990, C3 R$ 29.990
✅ CORRETO: "Temos sim! Temos o Cielo por R$ 22.990, Picanto por R$ 25.990, C3 por R$ 29.990... Quer saber mais de algum?"

===== EXEMPLOS DE RESPOSTAS =====

SITUAÇÃO 1: Cliente pede "Gol 2015" e na lista tem "Volkswagen Gol 2015 | R$ 45.990"
✅ CORRETO: "Temos sim o Gol 2015! Está por R$ 45.990. Quer saber mais?"
❌ ERRADO: "O Gol 2015 não está disponível. Mas temos o Gol 2015 por R$ 45.990"

SITUAÇÃO 2: Cliente pede "Civic 2020" e na lista NÃO tem Civic 2020
✅ CORRETO: "O Civic 2020 não está no estoque no momento. Temos outros modelos como..."
❌ ERRADO: "O Civic 2020 foi vendido" (você não sabe se foi vendido!)

SITUAÇÃO 3: Cliente pergunta "Já vendeu o Polo?"
- Primeiro PROCURE "Polo" na lista
- SE ENCONTRAR: "Não, o Polo ainda está disponível!"
- SE NÃO ENCONTRAR: "O Polo não está no estoque no momento"
- ❌ NUNCA diga "sim, foi vendido" só porque não achou na lista!

===== FIM DAS REGRAS =====
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

===== 📍 INFORMAÇÕES DA LOJA =====
- Endereço: Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde - Taubaté/SP, CEP 12050-620
- Telefone: (12) 98897-3547
- Horário: Segunda a Sexta das 9h às 18h, Sábados das 9h às 13h

⚠️ Quando o cliente perguntar "onde fica a loja", "qual o endereço", "onde vocês ficam", etc:
   → Responda com o endereço COMPLETO acima
   → NUNCA use placeholders como "[inserir endereço]" ou "[endereço da loja]"
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
    // Default year matching rule - REWRITTEN TO PREVENT HALLUCINATIONS
    systemPrompt += `

===== 🚗 REGRA DE ANO DO VEÍCULO (LEIA COM ATENÇÃO!) =====

🔴 PASSO A PASSO OBRIGATÓRIO:

1️⃣ PRIMEIRO: Procure na lista "VEÍCULOS DISPONÍVEIS" se existe EXATAMENTE o modelo+ano pedido
   - Exemplo: Cliente pediu "Gol 2015" → Procure "Gol" com ano "2015" na lista

2️⃣ SE ENCONTRAR o modelo+ano EXATO:
   ✅ Responda: "Sim! Temos o [modelo] [ano] por [preço exato da lista]!"
   ❌ NÃO diga "não temos" se o carro ESTÁ na lista!

3️⃣ SOMENTE SE NÃO ENCONTRAR o ano exato:
   - Procure o mesmo modelo em anos PRÓXIMOS (±2 anos)
   - Responda: "O [modelo] [ano pedido] não está no estoque, mas temos o [modelo] [ano disponível]!"

⚠️ ERRO GRAVE A EVITAR:
   - Cliente: "Quero saber sobre o Gol 2015"
   - Na lista: "Volkswagen Gol 2015 | R$ 45.990"
   - ❌ ERRADO: "O Gol 2015 não está disponível. Mas temos o Gol 2015 por R$ 45.990"
   - ✅ CORRETO: "Sim! Temos o Gol 2015 por R$ 45.990! Quer saber mais detalhes?"
`;
  }

  // ===== REGRA ESPECIAL PARA BUSCA POR PREÇO (pergunta aberta) =====
  if (ragQueryInfo && (ragQueryInfo.max_price || ragQueryInfo.total_vehicles_in_budget)) {
    const totalInBudget = ragQueryInfo.total_vehicles_in_budget || relevantVehicles.length;
    const shownCount = ragQueryInfo.shown_vehicles || relevantVehicles.length;
    const maxPrice = ragQueryInfo.max_price || 0;
    const requestedCat = ragQueryInfo.requested_category;
    const totalInCategory = ragQueryInfo.total_in_category;
    
    // Analisar categorias de veículos disponíveis para sugerir refinamento
    // USAR a função getVehicleCategory centralizada
    const vehicleCategories: Record<string, number> = {};
    const vehicleBrands: Record<string, number> = {};
    for (const v of relevantVehicles) {
      // Usar a função centralizada - agora está disponível no escopo
      const category = v.vehicle_category || getVehicleCategory(v.model || '', v.version || '');
      vehicleCategories[category] = (vehicleCategories[category] || 0) + 1;
      
      const brand = v.brand || 'Outro';
      vehicleBrands[brand] = (vehicleBrands[brand] || 0) + 1;
    }
    
    // ===== BUSCA ESPECÍFICA POR CATEGORIA (ex: "sedans até 100 mil") =====
    if (requestedCat) {
      if (ragQueryInfo.no_vehicles_in_category) {
        // Não encontrou veículos dessa categoria no orçamento
        systemPrompt += `

===== ⚠️ SEM ${requestedCat.toUpperCase()}S DISPONÍVEIS NESSA FAIXA =====

O cliente pediu ${requestedCat}s até R$ ${maxPrice.toLocaleString('pt-BR')}.

📊 RESULTADO:
   - Total de veículos no orçamento (TODAS categorias): ${totalInBudget}
   - ${requestedCat}s disponíveis nessa faixa: 0

⚠️ COMO RESPONDER:
1. Explique que não temos ${requestedCat}s nessa faixa específica
2. Ofereça ALTERNATIVAS - outras categorias que temos no orçamento
3. Pergunte se quer ver outras categorias

📝 EXEMPLO:
"No momento não temos ${requestedCat}s até R$ ${maxPrice.toLocaleString('pt-BR')} 😅

Mas temos outras opções ótimas nessa faixa! Você toparia ver um Hatch, SUV ou Picape?"
`;
      } else {
        // Encontrou veículos da categoria - LISTAR TODOS
        systemPrompt += `

===== 🎯 BUSCA: ${requestedCat.toUpperCase()}S ATÉ R$ ${maxPrice.toLocaleString('pt-BR')} =====

O cliente pediu especificamente ${requestedCat}s.

📊 RESULTADO:
   - ${requestedCat}s disponíveis nessa faixa: ${totalInCategory || shownCount}
   - Listados abaixo: ${shownCount}

⚠️ REGRA CRÍTICA - LISTAR APENAS ${requestedCat.toUpperCase()}S:
1. A lista abaixo JÁ ESTÁ FILTRADA para mostrar apenas ${requestedCat}s
2. Liste TODOS os veículos da lista - são especificamente o que o cliente pediu!
3. Use formato de LISTA NUMERADA com marca, modelo, versão, ano e preço
4. NÃO inclua veículos de outras categorias!

📝 FORMATO DE RESPOSTA:
"Aqui estão os ${requestedCat}s até R$ ${maxPrice.toLocaleString('pt-BR')}! 🚗

1. *Marca Modelo Versão Ano* - R$ X.XXX
2. *Marca Modelo Versão Ano* - R$ X.XXX
(continue para todos)

Algum te interessou? Posso mandar mais detalhes e fotos!"

⚠️ IMPORTANTE: Não repita que "não temos mais opções" se a lista já contém o que há!
`;
      }
    }
    // Se tem MUITAS opções (> 15) E não especificou categoria, sugerir refinamento
    else if (totalInBudget > 15) {
      const categoriesAvailable = Object.entries(vehicleCategories)
        .filter(([_, count]) => count >= 1)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', ');
      
      const topBrands = Object.entries(vehicleBrands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([brand, count]) => `${brand} (${count})`)
        .join(', ');
      
      systemPrompt += `

===== 💰 BUSCA POR FAIXA DE PREÇO - MUITAS OPÇÕES! =====

O cliente pediu veículos até R$ ${maxPrice.toLocaleString('pt-BR')}.

📊 ESTATÍSTICAS:
   - Total de veículos disponíveis nesta faixa: ${totalInBudget} (MUITOS!)
   - Listamos os ${shownCount} principais abaixo

🎯 ESTRATÉGIA DE REFINAMENTO:
Como são MUITAS opções, faça uma pergunta para REFINAR a busca!

📝 PERGUNTAS DE REFINAMENTO (escolha UMA):
1. "Temos ${totalInBudget} opções até R$ ${maxPrice.toLocaleString('pt-BR')}! 🚗 Pra ajudar melhor, você prefere: SUV, Sedan, Hatch ou Picape?"
2. "Opa, várias opções! Tá procurando carro pra família, trabalho ou uso no dia-a-dia?"
3. "São várias opções boas! Me conta: automático ou manual? Isso ajuda a filtrar!"

📋 CATEGORIAS DISPONÍVEIS:
${categoriesAvailable}

📋 MARCAS COM MAIS OPÇÕES:
${topBrands}

⚠️ REGRAS:
1. Se o cliente pedir ESPECIFICAMENTE para ver todos, liste os ${shownCount} principais
2. Se o cliente responder com uma categoria (ex: "SUV"), filtre e mostre apenas SUVs da lista
3. Se o cliente responder com marca (ex: "Chevrolet"), filtre e mostre apenas dessa marca
4. SEMPRE mencione que temos ${totalInBudget} opções no total

📝 EXEMPLO DE RESPOSTA:
"Temos ${totalInBudget} opções até R$ ${maxPrice.toLocaleString('pt-BR')}! 🚗

Pra te ajudar melhor, me conta: você prefere um SUV, Sedan, Hatch ou Picape?"
`;
    } else {
      // Menos de 15 opções - lista todos
      systemPrompt += `

===== 💰 BUSCA POR FAIXA DE PREÇO =====

O cliente pediu veículos até R$ ${maxPrice.toLocaleString('pt-BR')}.

📊 ESTATÍSTICAS:
   - Total de veículos disponíveis nesta faixa: ${totalInBudget}
   - Veículos listados abaixo: ${shownCount}

⚠️ REGRA CRÍTICA PARA BUSCA POR PREÇO:
1. Liste TODOS os veículos que estão na lista abaixo (são poucos, cabe listar!)
2. NÃO resuma dizendo "temos X opções" - LISTE CADA UM com marca, modelo, ano e preço
3. Use formato de LISTA NUMERADA:
   1. *Marca Modelo Ano* - R$ X.XXX
   2. *Marca Modelo Ano* - R$ X.XXX
   (continue para todos)

4. Se existirem mais veículos além dos listados:
   → Mencione: "Esses são os principais! Temos mais ${totalInBudget > shownCount ? totalInBudget - shownCount : 0} opções. Quer ver mais?"

5. ORGANIZE por faixa de preço:
   → "Mais próximos do seu orçamento:" (os mais caros da lista)
   → "Opções mais econômicas:" (os mais baratos)

📝 EXEMPLO DE RESPOSTA CORRETA:
"Até R$ ${maxPrice.toLocaleString('pt-BR')}, temos essas opções! 🚗

*Próximos do seu orçamento:*
1. *Chevrolet Onix 2023* - R$ 77.990
2. *Honda Civic 2015* - R$ 74.990

*Opções mais econômicas:*
3. *Ford Ka 2021* - R$ 54.990
4. *Volkswagen Gol 2021* - R$ 50.990

Qual te interessa? Posso mandar mais detalhes!"
`;
    }
  }

  // Se não encontrou nada no orçamento solicitado
  if (ragQueryInfo && ragQueryInfo.no_vehicles_in_budget) {
    systemPrompt += `

===== ⚠️ ORÇAMENTO FORA DO ESTOQUE =====
O cliente pediu veículos até R$ ${ragQueryInfo.max_price_requested?.toLocaleString('pt-BR')}, mas nosso estoque começa em preços mais altos.

⚠️ COMO RESPONDER:
1. Explique com GENTILEZA que nessa faixa específica não temos opções no momento
2. Mostre as opções MAIS BARATAS disponíveis como alternativa
3. Pergunte se ele pode considerar um valor um pouco maior

📝 EXEMPLO:
"Nessa faixa até R$ ${ragQueryInfo.max_price_requested?.toLocaleString('pt-BR')} não temos opções no momento 😅

Mas olha nossas opções mais acessíveis:
1. *Cherry Cielo 2012* - R$ 22.990
2. *Kia Picanto 2008* - R$ 25.990
3. *Peugeot 307 2010* - R$ 27.990

Dá pra considerar uma dessas?"
`;
  }

  if (specialInstructions.photo_instructions) {
    systemPrompt += `

===== REGRA DE FOTOS =====
${specialInstructions.photo_instructions}
`;
  } else {
    // Default photo instructions - UPDATED for natural conversation flow
    systemPrompt += `

===== 📸 REGRA CRÍTICA DE FOTOS =====

⚠️⚠️⚠️ PROIBIÇÃO ABSOLUTA: NUNCA envie foto de um veículo diferente do pedido! ⚠️⚠️⚠️

🚨 ERRO GRAVÍSSIMO A EVITAR:
   Cliente pergunta sobre: Chevrolet Tracker 2015
   ❌ NUNCA use fotos de: Jeep Renegade, Onix, ou QUALQUER outro carro
   ✅ APENAS use fotos que estejam ABAIXO da linha "Chevrolet Tracker 2015"

📸 COMO ENCONTRAR FOTOS:
1. Identifique o veículo EXATO que o cliente está perguntando (marca + modelo + ano)
2. Na lista de veículos, encontre a linha correspondente
3. As fotos disponíveis aparecem LOGO ABAIXO, na seção "📸 FOTOS DISPONÍVEIS:"
4. Se aparecer "⚠️ SEM FOTO", significa que NÃO temos fotos deste veículo

📸 CATEGORIAS DE FOTOS:
   - foto_principal: foto de capa/destaque
   - foto_painel: painel/instrumentos  
   - foto_bancos: bancos dianteiros/interior
   - foto_banco_traseiro: banco traseiro
   - foto_motor: motor do veículo
   - foto_frente: vista frontal externa
   - foto_traseira: vista traseira externa
   - foto_lateral_esq/foto_lateral_dir: vistas laterais

===== ⚠️⚠️⚠️ REGRA ABSOLUTAMENTE CRÍTICA DE ENVIO DE FOTOS ⚠️⚠️⚠️ =====

🚫🚫🚫 NUNCA, JAMAIS, EM HIPÓTESE ALGUMA escreva:
   ❌ "Sim! Aqui estão as fotos:"
   ❌ "Vou te mandar as fotos"
   ❌ "Segue a foto do..."
   ❌ "[ENVIAR_FOTO: URL]" (a tag NÃO pode aparecer como texto!)

✅✅✅ FORMATO OBRIGATÓRIO:
   - Escreva uma frase NATURAL e CURTA
   - Depois pule linha e coloque APENAS a(s) tag(s)
   - SEM texto antes/depois/junto da tag!

📝 EXEMPLOS CORRETOS:

Cliente: "Tem foto do carro?"
✅ CORRETO:
Claro, deixa eu te mostrar!

[ENVIAR_FOTO: https://url-da-foto.jpg]

Cliente: "Me manda umas fotos por favor"
✅ CORRETO:
Com certeza! Olha só como ele está lindo 😍

[ENVIAR_FOTO: https://url1.jpg]
[ENVIAR_FOTO: https://url2.jpg]
[ENVIAR_FOTO: https://url3.jpg]

📝 EXEMPLOS ERRADOS (NUNCA FAÇA):

❌ ERRADO: "Sim! Aqui estão as fotos da BMW X1 2022: [ENVIAR_FOTO: url]"
❌ ERRADO: "Vou te enviar as fotos agora [ENVIAR_FOTO: url]"
❌ ERRADO: "[ENVIAR_FOTO: url] Essa é a foto do painel"

⚠️ A tag [ENVIAR_FOTO:] será REMOVIDA e a foto enviada SEPARADAMENTE.
   Se você colocar texto junto, o cliente verá o texto SEM a foto junto!

Quando NÃO TEM foto:
"Infelizmente ainda não temos foto dos bancos do Tracker 2015 no sistema. Posso te mostrar pessoalmente na loja!"
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

  // ===== VEÍCULO ATIVO: Buscar TODAS as fotos categorizadas e incluir no prompt =====
  // Isso resolve o problema de "foto do painel" / "tem interna?" sem especificar o carro
  // Declarar fora do if para usar na validação de fotos depois
  let activeVehiclePhotos: { image_url: string; category: string | null; is_cover: boolean | null }[] = [];
  
  if (activeVehicle) {
    // Buscar TODAS as fotos categorizadas do veículo ativo DIRETAMENTE
    const { data: fetchedActivePhotos } = await supabase
      .from('vehicle_images')
      .select('image_url, category, is_cover')
      .eq('vehicle_id', activeVehicle.id)
      .order('display_order', { ascending: true });
    
    activeVehiclePhotos = fetchedActivePhotos || [];
    
    // ===== FALLBACK CRÍTICO: Se vehicle_images está vazio, usar array images legado =====
    if (activeVehiclePhotos.length === 0 && activeVehicle.images && Array.isArray(activeVehicle.images) && activeVehicle.images.length > 0) {
      console.log('[Active Vehicle Photos] No photos in vehicle_images table, falling back to legacy images array with', activeVehicle.images.length, 'photos');
      
      // Converter array legado para formato compatível
      activeVehiclePhotos = activeVehicle.images.map((url: string, index: number) => ({
        image_url: url,
        category: 'geral', // Fotos legadas não têm categoria
        is_cover: index === 0 // Primeira foto é a capa
      }));
    }
    
    console.log('[Active Vehicle Photos] Final count:', activeVehiclePhotos?.length || 0, 'photos for', activeVehicle.brand, activeVehicle.model);
    
    // Organizar fotos por categoria
    const activePhotosByCategory: Record<string, string[]> = {};
    let activeFotoPrincipal = '';
    
    if (activeVehiclePhotos && activeVehiclePhotos.length > 0) {
      for (const photo of activeVehiclePhotos) {
        if (photo.is_cover && !activeFotoPrincipal) {
          activeFotoPrincipal = photo.image_url;
        }
        const cat = photo.category || 'geral';
        if (!activePhotosByCategory[cat]) {
          activePhotosByCategory[cat] = [];
        }
        activePhotosByCategory[cat].push(photo.image_url);
      }
      if (!activeFotoPrincipal && activeVehiclePhotos.length > 0) {
        activeFotoPrincipal = activeVehiclePhotos[0].image_url;
      }
    }
    
    // Mapear categorias do banco para labels amigáveis
    const categoryLabelsActive: Record<string, string> = {
      'geral': 'foto_geral',
      'exterior_frontal': 'foto_frente',
      'exterior_traseira': 'foto_traseira',
      'exterior_lateral_esq': 'foto_lateral_esq',
      'exterior_lateral_dir': 'foto_lateral_dir',
      'interior_painel': 'foto_painel',
      'interior_bancos': 'foto_bancos',
      'interior_traseiro': 'foto_banco_traseiro',
      'motor': 'foto_motor',
      'porta_malas': 'foto_porta_malas',
      'documentos': 'foto_documentos',
      'detalhes': 'foto_detalhes',
    };
    
    systemPrompt += `\n
===== ⭐ VEÍCULO ATIVO DA CONVERSA =====
O cliente está conversando sobre este veículo ESPECÍFICO:
🚗 ${activeVehicle.brand} ${activeVehicle.model} ${activeVehicle.year_model || activeVehicle.year_fabrication || ''}

⚠️ REGRA CRÍTICA: Quando o cliente perguntar "foto do painel", "foto dos bancos", "tem interna?", "foto do motor", etc. SEM especificar o carro:
   → Assuma que ele quer do ${activeVehicle.brand} ${activeVehicle.model}
   → Use as fotos DESTE veículo listadas AQUI
   → NÃO pergunte "de qual carro?" - você já sabe!

📸 FOTOS DISPONÍVEIS DESTE VEÍCULO:`;

    if (activeFotoPrincipal) {
      systemPrompt += `\n   - foto_principal: ${activeFotoPrincipal}`;
    }
    
    // Listar TODAS as categorias com fotos
    for (const [cat, urls] of Object.entries(activePhotosByCategory)) {
      const label = categoryLabelsActive[cat] || `foto_${cat}`;
      // Mostrar primeira foto de cada categoria
      systemPrompt += `\n   - ${label}: ${urls[0]}`;
    }
    
    // ===== DESTACAR CLARAMENTE SE TEM FOTOS OU NÃO =====
    const totalPhotosCount = Object.values(activePhotosByCategory).reduce((sum, arr) => sum + arr.length, 0);
    console.log('[System Prompt] Active vehicle photo count:', totalPhotosCount, 'categories:', Object.keys(activePhotosByCategory));
    
    if (totalPhotosCount > 0) {
      console.log('[System Prompt] ✅ ADDING PHOTO AVAILABLE FLAG to prompt');
      systemPrompt += `\n\n🎉🎉🎉 ATENÇÃO MÁXIMA: ESTE VEÍCULO TEM ${totalPhotosCount} FOTOS! 🎉🎉🎉`;
      systemPrompt += `\n\n⚠️⚠️⚠️ REGRA CRÍTICA: Quando o cliente pedir QUALQUER foto do ${activeVehicle.model}:`;
      systemPrompt += `\n   → VOCÊ TEM FOTOS! Use a foto_principal ou foto_geral acima!`;
      systemPrompt += `\n   → PROIBIDO dizer "não temos foto" ou "foto não disponível"!`;
      systemPrompt += `\n   → Use o formato: "Claro! Aqui está:" e na PRÓXIMA LINHA: [ENVIAR_FOTO: URL]`;
      
      // Se tem fotos de interior categorizadas, destacar
      const interiorPhotos = ['interior_painel', 'interior_bancos', 'interior_traseiro'].filter(cat => activePhotosByCategory[cat]);
      if (interiorPhotos.length > 0) {
        systemPrompt += `\n✅ TEM FOTOS DE INTERIOR! (painel, bancos, banco traseiro)`;
      }
      
      // Se só tem fotos gerais, explicar que deve usar elas
      const onlyHasGeneralPhotos = Object.keys(activePhotosByCategory).length === 1 && activePhotosByCategory['geral'];
      if (onlyHasGeneralPhotos) {
        systemPrompt += `\n\n🔴 IMPORTANTE: Todas as ${totalPhotosCount} fotos estão na categoria 'geral'.`;
        systemPrompt += `\n   → Para QUALQUER pedido de foto (painel, bancos, frente, traseira, etc)`;
        systemPrompt += `\n   → Use a foto_geral ou foto_principal listada acima!`;
        systemPrompt += `\n   → NÃO diga que "não tem foto do interior" - USE a foto_geral!`;
      }
      
      // Mostrar categorias disponíveis
      const availableCategories = Object.keys(activePhotosByCategory).map(cat => categoryLabelsActive[cat] || cat);
      systemPrompt += `\n📋 Categorias disponíveis: ${availableCategories.join(', ')}`;
    } else {
      console.log('[System Prompt] ❌ No photos found for active vehicle');
      systemPrompt += `\n\n⚠️ ❌ NENHUMA FOTO CADASTRADA para o ${activeVehicle.brand} ${activeVehicle.model}`;
      systemPrompt += `\n→ Diga ao cliente que ainda não temos foto no sistema, mas pode mostrar pessoalmente na loja.`;
    }

    systemPrompt += `

⚠️ REGRAS DE FOTO:
   → Se TEM foto_principal ou foto_geral, SEMPRE use quando pedirem foto do ${activeVehicle.model}!
   → Se pedirem "foto interna" e NÃO existe foto específica, diga que não temos foto do interior (mas se tiver foto_geral, pode oferecer)
   → NUNCA diga "não temos foto" se existir foto_principal ou foto_geral listada acima!
===== FIM VEÍCULO ATIVO =====
`;
  }

  // Variável para armazenar URLs válidas por veículo (usado na validação de fotos)
  const validPhotoUrls: Record<string, Set<string>> = {};

  // ===== CRÍTICO: Adicionar fotos do activeVehicle ao mapa de validação =====
  // Sem isso, fotos do veículo ativo são bloqueadas!
  if (activeVehicle && activeVehiclePhotos && activeVehiclePhotos.length > 0) {
    validPhotoUrls[activeVehicle.id] = new Set();
    for (const photo of activeVehiclePhotos) {
      validPhotoUrls[activeVehicle.id].add(photo.image_url);
    }
    console.log('[Photo Validation] Added', activeVehiclePhotos.length, 'photos from activeVehicle to validPhotoUrls');
  }

  if (relevantVehicles.length > 0) {
    // Buscar fotos da tabela vehicle_images para cada veículo
    const vehicleIds = relevantVehicles.map((v: any) => v.id);
    const { data: vehiclePhotos } = await supabase
      .from('vehicle_images')
      .select('vehicle_id, image_url, category, is_cover')
      .in('vehicle_id', vehicleIds)
      .order('display_order', { ascending: true });
    
    // Agrupar fotos por veículo E construir mapa de URLs válidas
    const photosByVehicle: Record<string, { url: string; category: string | null; is_cover: boolean | null }[]> = {};
    if (vehiclePhotos) {
      vehiclePhotos.forEach((p: any) => {
        if (!photosByVehicle[p.vehicle_id]) {
          photosByVehicle[p.vehicle_id] = [];
        }
        photosByVehicle[p.vehicle_id].push({
          url: p.image_url,
          category: p.category,
          is_cover: p.is_cover
        });
        
        // Construir mapa de URLs válidas para validação posterior
        if (!validPhotoUrls[p.vehicle_id]) {
          validPhotoUrls[p.vehicle_id] = new Set();
        }
        validPhotoUrls[p.vehicle_id].add(p.image_url);
      });
    }
    
    // Contar o total de veículos no estoque para contextualizar a IA
    const { data: stockCount } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'disponivel');
    
    const totalInStock = stockCount?.length || relevantVehicles.length;
    
    systemPrompt += `\n\n=== VEÍCULOS SUGERIDOS (mostrando ${relevantVehicles.length} de ${totalInStock}+ no estoque) ===\n`;
    systemPrompt += `⚠️ IMPORTANTE: Estes são apenas alguns veículos RELEVANTES para a busca do cliente.\n`;
    systemPrompt += `NÃO diga "só temos esses" - temos MAIS veículos! Se o cliente perguntar quantos temos, diga "temos mais de ${totalInStock} veículos disponíveis".\n`;
    systemPrompt += `Se o cliente quiser ver outras opções ou modelos específicos não listados aqui, diga que pode buscar outras opções no estoque.\n\n`;
    
    relevantVehicles.forEach((v: any) => {
      const preco = v.sale_price ? `R$ ${Number(v.sale_price).toLocaleString('pt-BR')}` : 'Consultar';
      const km = v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : 'N/A';
      const ano = v.year_model || v.year_fabrication || 'N/A';
      const versao = v.version ? ` ${v.version}` : '';
      const similaridade = v.similarity ? ` (relevância: ${Math.round(v.similarity * 100)}%)` : '';
      
      // ADICIONAR CATEGORIA para que a IA saiba exatamente o tipo de cada veículo
      const categoria = v.vehicle_category || getVehicleCategory(v.model || '', v.version || '');
      
      // Pegar fotos da tabela vehicle_images OU do campo images (fallback)
      const dbPhotos = photosByVehicle[v.id] || [];
      const legacyPhotos = v.images && v.images.length > 0 ? v.images : [];
      
      // Organizar fotos por categoria
      const photosByCategory: Record<string, string> = {};
      let fotoPrincipal = '';
      
      if (dbPhotos.length > 0) {
        // Agrupar por categoria
        for (const photo of dbPhotos) {
          if (photo.is_cover && !fotoPrincipal) {
            fotoPrincipal = photo.url;
          }
          const cat = photo.category || 'geral';
          if (!photosByCategory[cat]) {
            photosByCategory[cat] = photo.url;
          }
        }
        // Se não achou foto de capa, usar a primeira
        if (!fotoPrincipal && dbPhotos.length > 0) {
          fotoPrincipal = dbPhotos[0].url;
        }
      } else if (legacyPhotos.length > 0) {
        fotoPrincipal = legacyPhotos[0];
        photosByCategory['geral'] = legacyPhotos[0];
        
        // ===== CRÍTICO: Adicionar fotos legadas ao mapa de validação =====
        // Sem isso, fotos do array images são bloqueadas na validação
        if (!validPhotoUrls[v.id]) {
          validPhotoUrls[v.id] = new Set();
        }
        for (const url of legacyPhotos) {
          validPhotoUrls[v.id].add(url);
        }
        console.log('[Photo Validation] Added', legacyPhotos.length, 'legacy photos from', v.brand, v.model, 'to validPhotoUrls');
      }
      
      // Montar linha do veículo com categoria e TODAS as fotos categorizadas
      systemPrompt += `• [${categoria}] ${v.brand} ${v.model}${versao} ${ano} | ${preco} | ${km}`;
      
      if (Object.keys(photosByCategory).length > 0 || fotoPrincipal) {
        systemPrompt += `\n  📸 FOTOS DISPONÍVEIS:`;
        if (fotoPrincipal) {
          systemPrompt += `\n     - foto_principal: ${fotoPrincipal}`;
        }
        // Mapear categorias para nomes legíveis
        const categoryLabels: Record<string, string> = {
          'geral': 'foto_geral',
          'exterior_frontal': 'foto_frente',
          'exterior_traseira': 'foto_traseira',
          'exterior_lateral_esq': 'foto_lateral_esq',
          'exterior_lateral_dir': 'foto_lateral_dir',
          'interior_painel': 'foto_painel',
          'interior_bancos': 'foto_bancos',
          'interior_traseiro': 'foto_banco_traseiro',
          'motor': 'foto_motor',
          'porta_malas': 'foto_porta_malas',
          'documentos': 'foto_documentos',
          'detalhes': 'foto_detalhes',
        };
        for (const [cat, url] of Object.entries(photosByCategory)) {
          if (cat === 'geral' && url === fotoPrincipal) continue; // Já incluída
          const label = categoryLabels[cat] || `foto_${cat}`;
          systemPrompt += `\n     - ${label}: ${url}`;
        }
      } else {
        systemPrompt += ` | ⚠️ SEM FOTO`;
      }
      systemPrompt += `${similaridade}\n`;
    });
    systemPrompt += '=== FIM DAS SUGESTÕES ===\n';
  } else {
    systemPrompt += '\n\n⚠️ Nenhum veículo encontrado para essa busca específica. Temos outros modelos no estoque - pergunte ao cliente qual modelo ou marca ele procura!\n';
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

    // ===== EXTRACT AND VALIDATE PHOTOS =====
    // Regex mais robusto para capturar variações da tag de foto
    // Captura: [ENVIAR_FOTO: URL], [ENVIAR FOTO: URL], [FOTO: URL], etc.
    const photoRegex = /\[\s*ENVIAR[_\s]*FOTO\s*:\s*(https?:\/\/[^\]\s\n]+)\s*\]/gi;
    // Regex de fallback para URLs soltas no formato do storage
    const rawUrlRegex = /(https:\/\/ahfoixzdnpswuqavbmgf\.supabase\.co\/storage\/v1\/object\/public\/vehicle-images\/[^\s\n\]]+)/gi;
    
    const extractedPhotos: string[] = [];
    const blockedPhotos: string[] = [];
    let match;
    
    // Helper function: Encontrar URL completa que começa com o prefixo truncado
    function findMatchingUrl(truncatedUrl: string, validUrls: Set<string>): string | null {
      // Limpar URL de caracteres extras
      const cleanUrl = truncatedUrl.replace(/[\]\)\s]+$/, '').trim();
      
      // 1. Match exato
      if (validUrls.has(cleanUrl)) {
        return cleanUrl;
      }
      // 2. Match por prefixo (IA às vezes trunca a URL)
      for (const fullUrl of validUrls) {
        if (fullUrl.startsWith(cleanUrl) || cleanUrl.startsWith(fullUrl)) {
          return fullUrl;
        }
        // 3. Comparar ignorando parâmetros de query string
        const baseClean = cleanUrl.split('?')[0];
        const baseFull = fullUrl.split('?')[0];
        if (baseClean === baseFull) {
          return fullUrl;
        }
      }
      // 4. Match por ID do veículo na URL (ex: /fada1afb-d745-4f79-93f0-070ffe86c4e2/)
      const uuidMatch = cleanUrl.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
      if (uuidMatch) {
        const vehicleUuid = uuidMatch[1].toLowerCase();
        for (const fullUrl of validUrls) {
          if (fullUrl.toLowerCase().includes(vehicleUuid)) {
            return fullUrl;
          }
        }
      }
      return null;
    }
    
    // PASSO 1: Extrair fotos da tag principal
    while ((match = photoRegex.exec(aiResponse)) !== null) {
      const photoUrl = match[1].trim().replace(/[\]\)\s]+$/, '');
      
      let isPhotoValid = false;
      let photoVehicleInfo = '';
      let resolvedUrl = photoUrl;
      
      // Verificar se foto pertence ao veículo ativo
      if (activeVehicle && validPhotoUrls[activeVehicle.id]) {
        const matchedUrl = findMatchingUrl(photoUrl, validPhotoUrls[activeVehicle.id]);
        if (matchedUrl) {
          isPhotoValid = true;
          resolvedUrl = matchedUrl;
          photoVehicleInfo = `${activeVehicle.brand} ${activeVehicle.model}`;
          console.log('[Photo Validation] ✅ VALID - Photo belongs to active vehicle:', photoVehicleInfo);
        }
      }
      
      // Verificar se pertence a algum veículo do contexto
      if (!isPhotoValid) {
        for (const vehicleId of Object.keys(validPhotoUrls)) {
          const matchedUrl = findMatchingUrl(photoUrl, validPhotoUrls[vehicleId]);
          if (matchedUrl) {
            const vehicleOwner = relevantVehicles.find((v: any) => v.id === vehicleId);
            if (vehicleOwner) {
              isPhotoValid = true;
              resolvedUrl = matchedUrl;
              photoVehicleInfo = `${vehicleOwner.brand} ${vehicleOwner.model}`;
              console.log('[Photo Validation] ✅ VALID - Photo belongs to:', photoVehicleInfo);
            }
            break;
          }
        }
      }
      
      if (isPhotoValid) {
        extractedPhotos.push(resolvedUrl);
      } else {
        blockedPhotos.push(photoUrl);
        console.warn('[Photo Validation] ❌ BLOCKED - Photo URL not from any vehicle in context:', photoUrl.substring(0, 100));
      }
    }

    // PASSO 1.5: FALLBACK - Extrair URLs soltas do storage (quando IA esquece a tag)
    // Só se não encontrou nenhuma foto com a tag principal
    if (extractedPhotos.length === 0) {
      console.log('[Photo Extraction] No photos from tags, trying rawUrlRegex fallback...');
      while ((match = rawUrlRegex.exec(aiResponse)) !== null) {
        const photoUrl = match[1].trim().replace(/[\]\)\s]+$/, '');
        
        // Evitar duplicatas
        if (extractedPhotos.includes(photoUrl)) continue;
        
        let isPhotoValid = false;
        let photoVehicleInfo = '';
        let resolvedUrl = photoUrl;
        
        // Verificar se foto pertence ao veículo ativo
        if (activeVehicle && validPhotoUrls[activeVehicle.id]) {
          const matchedUrl = findMatchingUrl(photoUrl, validPhotoUrls[activeVehicle.id]);
          if (matchedUrl) {
            isPhotoValid = true;
            resolvedUrl = matchedUrl;
            photoVehicleInfo = `${activeVehicle.brand} ${activeVehicle.model}`;
            console.log('[Photo Validation Fallback] ✅ VALID - Photo belongs to active vehicle:', photoVehicleInfo);
          }
        }
        
        // Verificar se pertence a algum veículo do contexto
        if (!isPhotoValid) {
          for (const vehicleId of Object.keys(validPhotoUrls)) {
            const matchedUrl = findMatchingUrl(photoUrl, validPhotoUrls[vehicleId]);
            if (matchedUrl) {
              const vehicleOwner = relevantVehicles.find((v: any) => v.id === vehicleId);
              if (vehicleOwner) {
                isPhotoValid = true;
                resolvedUrl = matchedUrl;
                photoVehicleInfo = `${vehicleOwner.brand} ${vehicleOwner.model}`;
                console.log('[Photo Validation Fallback] ✅ VALID - Photo belongs to:', photoVehicleInfo);
              }
              break;
            }
          }
        }
        
        if (isPhotoValid) {
          extractedPhotos.push(resolvedUrl);
        } else {
          blockedPhotos.push(photoUrl);
          console.warn('[Photo Validation Fallback] ❌ BLOCKED - Photo URL not from any vehicle in context:', photoUrl.substring(0, 100));
        }
      }
      
      if (extractedPhotos.length > 0) {
        console.log('[Photo Extraction] Fallback found', extractedPhotos.length, 'valid photos from raw URLs');
      }
    }

    // Regex ultra-agressivo para garantir que nenhuma tag apareça no texto final
    let cleanResponse = aiResponse
      // Remove tag formatada corretamente
      .replace(/\[\s*ENVIAR[_\s]*FOTO\s*:\s*https?:\/\/[^\]\n]+\s*\]/gi, '')
      // Remove variações com underscore
      .replace(/\[\s*ENVIAR_FOTO\s*:\s*https?:\/\/[^\]\n]+\s*\]/gi, '')
      // Remove variações sem underscore
      .replace(/\[\s*ENVIAR\s+FOTO\s*:\s*https?:\/\/[^\]\n]+\s*\]/gi, '')
      // Remove qualquer [algo_FOTO: url]
      .replace(/\[[^\]]*FOTO\s*:\s*https?:\/\/[^\]\n]+\]/gi, '')
      // Remove URLs soltas do Supabase storage que ficaram órfãs
      .replace(/https:\/\/ahfoixzdnpswuqavbmgf\.supabase\.co\/storage\/v1\/object\/public\/vehicle-images\/[^\s\n\]]+/gi, '')
      // Remove tags de dados
      .replace(/\[DADO:[^\]]+\]/g, '')
      // Limpar múltiplas quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('[AI Agent] Extracted photos:', extractedPhotos.length, '| Blocked:', blockedPhotos.length);
    console.log('[AI Agent] Clean response length:', cleanResponse.length);

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
      
      // HANDOFF is now sent directly in extractAndSaveQualificationData when Q2 is reached
      // We do NOT append handoff message to finalResponse anymore to avoid duplication
      // The handoff message is sent as a separate WhatsApp message in the Q2 flow
      if (qualResult.newlyQualified) {
        console.log('[Qualification] Lead newly qualified (Q2) - handoff message sent separately by Q2 flow');
      }
      
      // ===== CRIAR ALERTA DE INTERESSE QUANDO VEÍCULO NÃO ESTÁ EM ESTOQUE =====
      // Detecta padrões de "não temos" na resposta da IA e cria alerta automático
      // Busca o nome do lead para usar no alerta
      const { data: leadForAlert } = await supabase
        .from('leads')
        .select('name')
        .eq('id', leadId)
        .single();
      
      await detectAndCreateVehicleInterestAlert(
        supabase,
        aiResponse,
        actualMessage,
        leadId,
        conversation.id,
        leadForAlert?.name || 'Cliente',
        phone
      );
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
  
  // First, split by double line breaks
  const rawParagraphs = text
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);
  
  // Merge short paragraphs (labels like "*Bancos:*") with the next one
  const paragraphs: string[] = [];
  let pendingLabel = '';
  
  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];
    
    // If paragraph is very short (label-like), merge with next
    // e.g., "*Bancos:*" alone should be merged with what follows
    if (p.length < 40 && (p.startsWith('*') || p.startsWith('•') || p.startsWith('-') || p.endsWith(':'))) {
      pendingLabel += (pendingLabel ? '\n' : '') + p;
    } else if (pendingLabel) {
      // Merge pending label with current paragraph
      paragraphs.push(pendingLabel + '\n' + p);
      pendingLabel = '';
    } else {
      paragraphs.push(p);
    }
  }
  
  // If there's a trailing label without content, add it
  if (pendingLabel) {
    paragraphs.push(pendingLabel);
  }
  
  if (paragraphs.length > 1) {
    console.log('[AI Agent] Sending', paragraphs.length, 'separate messages (merged short labels)');
    for (let i = 0; i < paragraphs.length; i++) {
      await sendWhatsAppMessage(instanceName, targetJid, paragraphs[i]);
      if (i < paragraphs.length - 1) {
        const delay = getHumanDelay();
        console.log('[AI Agent] Waiting', Math.round(delay), 'ms before next message');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } else if (text.length > 600) {
    // Only split very long messages (increased threshold)
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim());
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 500) {
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
    // Send as single message
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
    
    // ===== NEW: Create NEW negotiation when vehicle interest changes =====
    // Instead of updating, we CREATE a new negotiation (hidden from pipeline)
    // that appears only on the lead's detail page
    if (updates.vehicle_interest) {
      const interestLower = updates.vehicle_interest.toLowerCase();
      
      // Search for matching vehicle in inventory
      const { data: matchingVehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, status')
        .or(`model.ilike.%${interestLower}%,brand.ilike.%${interestLower}%`)
        .eq('status', 'Disponível')
        .limit(5);
      
      if (matchingVehicles && matchingVehicles.length > 0) {
        // Find best match (prioritize exact model match)
        let bestMatch = matchingVehicles[0];
        for (const v of matchingVehicles) {
          if (v.model.toLowerCase().includes(interestLower) || 
              interestLower.includes(v.model.toLowerCase())) {
            bestMatch = v;
            break;
          }
        }
        
        // Check if we already have a negotiation for this exact vehicle
        const { data: existingNegotiation } = await supabase
          .from('negotiations')
          .select('id')
          .eq('lead_id', leadId)
          .eq('vehicle_id', bestMatch.id)
          .maybeSingle();
        
        if (!existingNegotiation) {
          // Get the salesperson from the existing primary negotiation
          const { data: primaryNegotiation } = await supabase
            .from('negotiations')
            .select('salesperson_id')
            .eq('lead_id', leadId)
            .eq('show_in_pipeline', true)
            .single();
          
          console.log('[Qualification] Creating NEW negotiation for vehicle:', bestMatch.brand, bestMatch.model, bestMatch.id);
          
          // Create new negotiation, hidden from pipeline
          await supabase
            .from('negotiations')
            .insert({
              lead_id: leadId,
              vehicle_id: bestMatch.id,
              salesperson_id: primaryNegotiation?.salesperson_id || null,
              status: 'atendimento_ia',
              show_in_pipeline: false, // Hidden from main pipeline
              notes: `Interesse em ${bestMatch.brand} ${bestMatch.model} identificado na conversa`,
            });
        } else {
          console.log('[Qualification] Negotiation already exists for this vehicle, skipping creation');
        }
      }
    }
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

  // ===== Q2 CHECK: Q1 + Vehicle Interest + MINIMUM MESSAGES =====
  // Q2 requires: 
  // 1. vehicle_interest detected in THIS conversation (updates), not just historical data
  // 2. MINIMUM of 6 messages exchanged (3 from each side) to prevent premature handoff
  // 3. At least 2 distinct user messages mentioning vehicle interest
  const currentLevelAfterQ1 = currentLevel === 'q0' ? 'q1' : currentLevel;
  
  if (currentLevelAfterQ1 === 'q1') {
    // CRITICAL: Only use NEW updates.vehicle_interest, NOT historical qualData.vehicle_interest
    // This prevents triggering handoff just because lead had interest in a previous conversation
    const hasNewVehicleInterest = !!updates.vehicle_interest;
    
    // Get message count to ensure we have enough conversation before handoff
    const messageCount = qualData.message_count || 0;
    const MINIMUM_MESSAGES_FOR_Q2 = 6; // At least 6 messages (3 exchanges) before handoff
    
    console.log('[Q2 Check] Has NEW vehicle interest in this message:', hasNewVehicleInterest);
    console.log('[Q2 Check] Historical vehicle_interest:', qualData.vehicle_interest || 'none');
    console.log('[Q2 Check] Message count:', messageCount, '| Minimum required:', MINIMUM_MESSAGES_FOR_Q2);
    
    // CRITICAL: Only progress to Q2 if we have BOTH vehicle interest AND enough messages
    if (hasNewVehicleInterest && messageCount >= MINIMUM_MESSAGES_FOR_Q2) {
      console.log('[Q2] Vehicle interest confirmed AND minimum messages reached, progressing to Q2');
      
      // Get assigned salesperson name for handoff message
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to, name, phone, vehicle_interest')
        .eq('id', leadId)
        .single();
      
      // Get conversation ID for this lead to fetch history
      const { data: conversation } = await supabase
        .from('ai_agent_conversations')
        .select('id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      let salespersonName: string | undefined;
      let salespersonPhone: string | undefined;
      
      if (lead?.assigned_to) {
        const { data: salesperson } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', lead.assigned_to)
          .single();
        
        salespersonName = salesperson?.full_name || undefined;
        salespersonPhone = salesperson?.phone || undefined;
        
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
        
        // ===== SEND HANDOFF MESSAGE TO LEAD =====
        // Get WhatsApp contact for the lead to send transition message
        const { data: whatsappContact } = await supabase
          .from('whatsapp_contacts')
          .select('phone, instance_id')
          .eq('lead_id', leadId)
          .limit(1)
          .single();
        
        if (whatsappContact) {
          // Get instance name
          const { data: waInstance } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('id', whatsappContact.instance_id)
            .single();
          
          if (waInstance) {
            // Format phone for WhatsApp
            let leadPhone = whatsappContact.phone.replace(/\D/g, '');
            if (!leadPhone.startsWith('55')) {
              leadPhone = '55' + leadPhone;
            }
            const targetJid = `${leadPhone}@s.whatsapp.net`;
            
            // Send handoff message to lead
            const handoffMessage = `Perfeito! Já registrei todas as suas informações aqui. ✅

O *${salespersonName || 'nosso vendedor'}* vai entrar em contato com você em instantes para dar sequência no seu atendimento e tirar todas as suas dúvidas! 🚗

Fique tranquilo(a), você está em ótimas mãos! 😊`;
            
            await sendWhatsAppMessage(waInstance.instance_name, targetJid, handoffMessage);
            console.log('[Q2] Handoff message sent to lead');
          }
        }
        
        // Send WhatsApp notification to salesperson with full context
        if (salespersonPhone) {
          await sendWhatsAppToSalesperson(supabase, salespersonPhone, lead, updatedQualData, conversation?.id);
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
  
  // Get last 10 messages from conversation (most recent)
  const { data: recentMessages } = await supabase
    .from('ai_agent_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Reverse to get chronological order for analysis
  const messages = recentMessages?.reverse() || [];
  
  // CRITICAL: Need at least 4 messages (real conversation) before extracting vehicle_interest
  // This prevents false positives from single-message greetings
  // 4 messages = at least 2 exchanges (user -> bot -> user -> bot)
  const MINIMUM_MESSAGES_FOR_EXTRACTION = 4;
  
  if (!messages || messages.length < MINIMUM_MESSAGES_FOR_EXTRACTION) {
    console.log('[Qualification] Skipping AI extraction - only', messages?.length || 0, 'messages (need at least', MINIMUM_MESSAGES_FOR_EXTRACTION, ')');
    return {};
  }
  
  // CRITICAL: Count how many USER messages there are
  // We need at least 2 user messages (not just bot responses) to detect real intent
  const userMessageCount = messages.filter((m: any) => m.role === 'user').length;
  if (userMessageCount < 2) {
    console.log('[Qualification] Skipping AI extraction - only', userMessageCount, 'USER messages (need at least 2)');
    return {};
  }
  
  // Build conversation text
  const conversationText = messages
    .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Vendedor'}: ${m.content}`)
    .join('\n\n');
  
  console.log('[Qualification] Running AI extraction on', messages.length, 'messages (', userMessageCount, 'from user)');
  
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
            content: `Você é um extrator ULTRA RIGOROSO de dados de conversas de vendas de veículos.

⛔ REGRA CRÍTICA #1 - VEHICLE_INTEREST:
O campo vehicle_interest deve ser preenchido SOMENTE se:
1. O cliente MENCIONOU um modelo ESPECÍFICO de veículo (Polo, Civic, Gol, etc.)
2. E demonstrou INTENÇÃO DE COMPRA (não apenas pergunta casual)

❌ NÃO extraia vehicle_interest se:
- Cliente perguntou "tem carro bom?" → {}
- Cliente perguntou "vocês tem sedan?" → {} (categoria genérica não conta!)
- Cliente perguntou "tem algo até 50 mil?" → {} (apenas preço não conta!)
- Cliente disse apenas "oi", "olá" → {}
- Cliente fez perguntas sobre a loja → {}

✅ EXTRAIA vehicle_interest SOMENTE se:
- Cliente disse "quero ver o Polo" → {"vehicle_interest": "Polo"}
- Cliente disse "interessado no Civic 2020" → {"vehicle_interest": "Civic 2020"}
- Cliente disse "tem HB20 ou Onix?" → {"vehicle_interest": "HB20, Onix"}
- Cliente demonstrou interesse REAL em modelo específico em pelo menos 2 mensagens

⚠️ REGRA CRÍTICA #2 - INTENÇÃO DE COMPRA:
Diferencie PERGUNTAS CASUAIS de INTENÇÃO REAL:
- "Vocês tem carro?" = casual, retorne {}
- "Quanto custa o Polo?" = casual, retorne {}  
- "Quero comprar um Polo" = intenção real!
- "Gostei do Polo, pode me mandar mais fotos?" = intenção real!

⚠️ CUIDADO COM FALSOS POSITIVOS DE TROCA:
- "Já vendeu a Doblo?" = pergunta sobre ESTOQUE, NÃO é dado de troca!
- "Vocês já venderam?" = pergunta sobre estoque, NÃO indica troca
- "Tenho um Gol para trocar" = tem troca confirmado

Retorne um JSON com APENAS os campos que o CLIENTE demonstrou INTENÇÃO REAL:
- vehicle_interest: string (APENAS com modelo específico + intenção de compra)
- budget: number (APENAS se disse valor concreto que TEM para gastar)
- down_payment: number (APENAS se disse valor de entrada)
- desired_installment: number (APENAS se disse valor de parcela)
- has_trade_in: boolean (APENAS se confirmou que tem ou não tem troca)
- trade_in_vehicle: string (APENAS se disse qual carro dele tem para trocar)
- clean_credit: boolean (APENAS se confirmou nome limpo/sujo)
- cpf: string (APENAS se informou o CPF)

🎯 IMPORTANTE: Na dúvida, retorne {}. É melhor não extrair do que extrair errado!

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
    await sendWhatsAppToSalesperson(supabase, salesperson.phone, lead, qualData, undefined);
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
  } | null,
  conversationId?: string
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

    // ===== FETCH CONVERSATION HISTORY FOR SUMMARY =====
    let conversationSummary = '';
    let aiInsights = '';
    
    if (conversationId) {
      console.log('[Notification] Fetching conversation history for summary, conversationId:', conversationId);
      
      // Get last 20 messages from conversation
      const { data: messages } = await supabase
        .from('ai_agent_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      
      if (messages && messages.length > 0) {
        // Build conversation text for AI analysis
        const conversationText = messages
          .filter((m: any) => m.content)
          .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Gabi'}: ${m.content}`)
          .join('\n');
        
        // Generate summary and insights with AI
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        
        if (OPENAI_API_KEY && conversationText.length > 50) {
          try {
            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    content: `Você é um assistente de vendas automotivas. Analise a conversa entre um cliente e a atendente virtual Gabi.

Gere uma resposta em DUAS partes:

1. **RESUMO** (máx 3 linhas): O que o cliente quer, principais pontos da conversa
2. **DICAS PARA O VENDEDOR** (máx 4 bullet points): Insights estratégicos baseados na conversa que ajudem o vendedor a fechar a venda

Foque em:
- Objeções ou preocupações do cliente
- Preferências específicas mencionadas
- Urgência ou timing para compra
- Pontos de sensibilidade (preço, condição, etc)

Seja direto e prático. Use emojis com moderação.`
                  },
                  {
                    role: 'user',
                    content: `Conversa:\n${conversationText}`
                  }
                ],
                max_tokens: 400,
                temperature: 0.7,
              }),
            });
            
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const analysisContent = aiData.choices?.[0]?.message?.content || '';
              
              if (analysisContent) {
                // Parse the AI response into summary and insights
                const parts = analysisContent.split(/\*\*DICAS|DICAS PARA O VENDEDOR|💡/i);
                
                if (parts.length >= 2) {
                  conversationSummary = parts[0].replace(/\*\*RESUMO\*\*|RESUMO:/gi, '').trim();
                  aiInsights = parts[1].trim();
                } else {
                  conversationSummary = analysisContent;
                }
              }
            }
          } catch (aiError) {
            console.error('[Notification] Error generating AI insights:', aiError);
          }
        }
      }
    }

    // Build the full message with summary and insights
    let summarySection = '';
    if (conversationSummary) {
      summarySection = `

━━━━━━━━━━━━━━━━━━━━━
📝 *RESUMO DA CONVERSA*
${conversationSummary}`;
    }

    let insightsSection = '';
    if (aiInsights) {
      insightsSection = `

━━━━━━━━━━━━━━━━━━━━━
🎯 *DICAS PARA FECHAR*
${aiInsights}`;
    }

    // Build PERSONALIZED ficha - only show what was actually collected
    const financialLines: string[] = [];
    if (qualData?.budget) financialLines.push(`• Orçamento: ${formatCurrency(qualData.budget)}`);
    if (qualData?.down_payment) financialLines.push(`• Entrada: ${formatCurrency(qualData.down_payment)}`);
    if (qualData?.desired_installment) financialLines.push(`• Parcela: ${formatCurrency(qualData.desired_installment)}/mês`);
    if (qualData?.clean_credit !== undefined) {
      financialLines.push(`• Crédito: ${qualData.clean_credit === true ? '✅ Nome limpo' : '❌ Com restrição'}`);
    }
    if (qualData?.cpf) financialLines.push(`• CPF: ${qualData.cpf}`);
    
    const financialSection = financialLines.length > 0 
      ? `\n💰 *PERFIL FINANCEIRO*\n${financialLines.join('\n')}`
      : '';
    
    const interestSection = qualData?.vehicle_interest 
      ? `\n\n🚗 *INTERESSE*\n${qualData.vehicle_interest}`
      : '';

    const fichaMensagem = `🔥 *LEAD QUENTE - AÇÃO IMEDIATA*

━━━━━━━━━━━━━━━━━━━━━
👤 *${lead?.name || 'Cliente'}*
📱 ${whatsappLink}
━━━━━━━━━━━━━━━━━━━━━${financialSection}${interestSection}${summarySection}${insightsSection}${suggestionsSection}

━━━━━━━━━━━━━━━━━━━━━
⚡ *Entre em contato agora!*`;

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
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    console.log('[RAG] No OPENAI_API_KEY, skipping RAG search');
    return { vehicles: [], query_info: null };
  }
  
  try {
    // Generate embedding for the query using OpenAI directly
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('[RAG] Embedding error:', errorText);
      return { vehicles: [], query_info: null };
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    
    if (!queryEmbedding) {
      console.log('[RAG] No embedding returned');
      return { vehicles: [], query_info: null };
    }
    
    console.log('[RAG] Embedding generated successfully, dimensions:', queryEmbedding.length);

    // Extract year from query
    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    const extractedYear = yearMatch ? parseInt(yearMatch[0]) : null;

    // Call Supabase RPC for vector search
    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '');
    
    // CORRIGIDO: Threshold reduzido de 0.5 para 0.3 para capturar mais resultados
    // O sistema de busca direta complementa com filtros por modelo/marca
    const { data: searchResults, error } = await supabase
      .rpc('search_similar_vehicles', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,  // Era 0.5 - muito restritivo!
        match_count: 15,       // Era 10 - aumentado para mais opções
        year_tolerance: 3,     // Era 2 - aumentado para mais flexibilidade
        target_year: extractedYear
      });
    
    console.log('[RAG] Vector search returned', searchResults?.length || 0, 'results');

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

// ===== DETECTAR QUANDO VEÍCULO NÃO ESTÁ EM ESTOQUE E CRIAR ALERTA AUTOMÁTICO =====
// Esta função analisa a resposta da IA para detectar quando ela indica que um veículo
// não está disponível e automaticamente cria um alerta de interesse na tabela vehicle_interest_alerts
async function detectAndCreateVehicleInterestAlert(
  supabase: any,
  aiResponse: string,
  userMessage: string,
  leadId: string | null,
  conversationId: string,
  customerName: string,
  customerPhone: string
): Promise<void> {
  try {
    // Padrões que indicam "não temos" ou "não está em estoque"
    const outOfStockPatterns = [
      /não\s+temos?\s+(?:o|a|esse|essa|este|esta)?[\s]?(?:modelo|veículo|carro)?[\s]*(?:de\s+)?([a-zA-ZÀ-ú0-9\s\-]+)?\s*(?:no\s+)?(?:estoque|momento|disponível)?/gi,
      /(?:o|a)?\s*([a-zA-ZÀ-ú\-]+(?:\s+[a-zA-ZÀ-ú\-]+)?)\s+não\s+está\s+(?:no\s+estoque|disponível|no\s+momento)/gi,
      /(?:no\s+momento|infelizmente),?\s+não\s+temos\s+(?:o|a)?\s*([a-zA-ZÀ-ú0-9\s\-]+)/gi,
      /esse?\s+modelo(?:\/ano)?\s+não\s+está\s+no\s+estoque/gi,
      /não\s+temos?\s+(?:HR-?V|HRV|Civic|Corolla|Hilux|Ranger|S10|Onix|Tracker|Creta|Compass|T-Cross|Kicks|Renegade|Toro|Argo|Cronos|Polo|Virtus|Jetta|Sentra|Yaris|Etios|Fit|City|Cruze|Cobalt|Prisma|Spin|Montana|Saveiro|Strada|Fiat|Chevrolet|Volkswagen|Ford|Toyota|Honda|Hyundai|Jeep|Nissan|Renault|Peugeot|Citroën|Kia|Mitsubishi)[^\.]*/gi,
    ];
    
    const responseLower = aiResponse.toLowerCase();
    const messageLower = userMessage.toLowerCase();
    
    // Verificar se a resposta contém indicação de "não temos"
    let matchedOutOfStock = false;
    let extractedModel = '';
    
    for (const pattern of outOfStockPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(aiResponse);
      if (match) {
        matchedOutOfStock = true;
        if (match[1]) {
          extractedModel = match[1].trim();
        }
        break;
      }
    }
    
    // Se não encontrou padrão específico, verificar frases simples
    if (!matchedOutOfStock) {
      if (
        responseLower.includes('não temos') ||
        responseLower.includes('não está no estoque') ||
        responseLower.includes('não está disponível') ||
        responseLower.includes('esse modelo/ano não está')
      ) {
        matchedOutOfStock = true;
      }
    }
    
    if (!matchedOutOfStock) {
      console.log('[Vehicle Interest Alert] No out-of-stock pattern detected');
      return;
    }
    
    console.log('[Vehicle Interest Alert] OUT OF STOCK detected! Creating alert...');
    
    // Extrair o modelo/marca que o cliente pediu da mensagem original
    let vehicleBrand: string | null = null;
    let vehicleModel: string | null = null;
    
    // Tentar extrair modelo da mensagem do usuário
    // Lista expandida de modelos conhecidos - inclui premium/luxo
    const knownModels = [
      // Honda
      'hrv', 'hr-v', 'civic', 'fit', 'city', 'accord', 'cr-v', 'crv', 'wr-v', 'wrv',
      // Toyota
      'corolla', 'hilux', 'yaris', 'etios', 'camry', 'rav4', 'sw4', 'prius', 'corolla cross',
      // Chevrolet
      's10', 'onix', 'tracker', 'cruze', 'cobalt', 'prisma', 'spin', 'montana', 'trailblazer', 'equinox',
      // Ford
      'ranger', 'ka', 'fiesta', 'ecosport', 'territory', 'bronco', 'maverick', 'edge', 'fusion', 'mustang',
      // Hyundai
      'creta', 'tucson', 'santa fe', 'ix35', 'hb20', 'hb20s', 'azera', 'elantra', 'sonata', 'kona',
      // Jeep
      'compass', 'renegade', 'commander', 'wrangler', 'gladiator', 'cherokee', 'grand cherokee',
      // Fiat
      'toro', 'argo', 'cronos', 'mobi', 'uno', 'palio', 'siena', 'grand siena', 'linea', 'bravo', 
      'punto', 'freemont', 'doblo', 'ducato', 'fiorino', 'strada', 'pulse', 'fastback',
      // Volkswagen
      'polo', 'virtus', 'jetta', 'gol', 'voyage', 'up', 'fox', 'spacefox', 'crossfox', 'golf', 
      'passat', 'amarok', 'tiguan', 'taos', 'nivus', 't-cross', 'tcross', 'tiguan allspace',
      // Nissan
      'kicks', 'sentra', 'versa', 'march', 'frontier', 'leaf',
      // Renault
      'kwid', 'sandero', 'logan', 'duster', 'captur', 'oroch', 'stepway',
      // Peugeot / Citroën
      '208', '2008', '3008', '5008', 'c3', 'c4', 'aircross', 'c4 cactus',
      // Kia / Mitsubishi
      'cerato', 'sportage', 'sorento', 'soul', 'picanto', 'stinger', 'carnival',
      'l200', 'outlander', 'pajero', 'asx', 'lancer', 'eclipse cross',
      // BMW - TODOS OS MODELOS
      'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'ix', 'ix3',
      'serie 1', 'serie 2', 'serie 3', 'serie 4', 'serie 5', 'serie 6', 'serie 7', 'serie 8',
      '116i', '118i', '120i', '218i', '220i', '320i', '325i', '328i', '330i', '335i', '340i',
      '420i', '430i', '520i', '525i', '528i', '530i', '540i', '550i', '640i', '650i', '730i', '740i', '750i',
      'm2', 'm3', 'm4', 'm5', 'm8', 'z4',
      // Audi
      'a1', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'q3', 'q5', 'q7', 'q8', 'e-tron', 'tt', 'r8', 'rs3', 'rs5', 'rs6',
      // Mercedes
      'c180', 'c200', 'c250', 'c300', 'c350', 'e200', 'e250', 'e300', 'e350', 'e400',
      'gla', 'glb', 'glc', 'gle', 'gls', 'cla', 'classe a', 'classe c', 'classe e', 'classe s',
      'a180', 'a200', 'a250', 'a35', 'a45', 'amg gt',
      // Land Rover / Jaguar
      'evoque', 'range rover', 'discovery', 'defender', 'velar', 'freelander', 'sport',
      'f-pace', 'e-pace', 'xe', 'xf', 'xj', 'f-type',
      // Volvo
      'xc40', 'xc60', 'xc90', 's60', 's90', 'v40', 'v60',
      // Porsche
      'cayenne', 'macan', 'panamera', '911', 'boxster', 'cayman', 'taycan',
      // Outros
      'sprinter', 'master', 'jumper', 'kangoo', 'partner', 'berlingo'
    ];
    
    const knownBrands = [
      'fiat', 'chevrolet', 'volkswagen', 'vw', 'ford', 'toyota', 'honda', 'hyundai',
      'jeep', 'nissan', 'renault', 'peugeot', 'citroën', 'citroen', 'kia', 'mitsubishi',
      'audi', 'bmw', 'mercedes', 'land rover', 'volvo', 'subaru', 'suzuki', 'jac',
      'chery', 'caoa chery', 'byd', 'gwm', 'haval', 'ram', 'dodge'
    ];
    
    // Procurar modelo na mensagem do usuário
    for (const model of knownModels) {
      if (messageLower.includes(model.toLowerCase())) {
        vehicleModel = model.toUpperCase().replace('-', '');
        break;
      }
    }
    
    // Procurar marca na mensagem do usuário
    for (const brand of knownBrands) {
      if (messageLower.includes(brand.toLowerCase())) {
        vehicleBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
        break;
      }
    }
    
    // Se extraímos modelo da resposta da IA, usar também
    if (!vehicleModel && extractedModel) {
      vehicleModel = extractedModel.toUpperCase();
    }
    
    // Se não conseguiu extrair nada específico, usar a mensagem como nota
    if (!vehicleBrand && !vehicleModel) {
      console.log('[Vehicle Interest Alert] Could not extract specific brand/model, saving user message as note');
    }
    
    // Verificar se já existe alerta ativo para este lead com mesmo modelo
    if (leadId && vehicleModel) {
      const { data: existingAlert } = await supabase
        .from('vehicle_interest_alerts')
        .select('id')
        .eq('lead_id', leadId)
        .ilike('vehicle_model', `%${vehicleModel}%`)
        .eq('status', 'active')
        .maybeSingle();
      
      if (existingAlert) {
        console.log('[Vehicle Interest Alert] Alert already exists for this lead/model, skipping');
        return;
      }
    }
    
    // Buscar negotiation_id se existir
    let negotiationId: string | null = null;
    if (leadId) {
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      negotiationId = negotiation?.id || null;
    }
    
    // Criar o alerta de interesse
    const alertData = {
      lead_id: leadId,
      negotiation_id: negotiationId,
      customer_name: customerName,
      customer_phone: customerPhone,
      vehicle_brand: vehicleBrand,
      vehicle_model: vehicleModel,
      notes: `Cliente perguntou: "${userMessage.substring(0, 200)}"${userMessage.length > 200 ? '...' : ''}\n\nResposta IA: "${aiResponse.substring(0, 200)}"${aiResponse.length > 200 ? '...' : ''}`,
      status: 'active',
    };
    
    const { data: newAlert, error: alertError } = await supabase
      .from('vehicle_interest_alerts')
      .insert(alertData)
      .select()
      .single();
    
    if (alertError) {
      console.error('[Vehicle Interest Alert] Error creating alert:', alertError);
      return;
    }
    
    console.log('[Vehicle Interest Alert] ✅ Alert created successfully!', {
      alertId: newAlert.id,
      leadId,
      brand: vehicleBrand,
      model: vehicleModel,
    });
    
    // Criar notificação para gerentes sobre a demanda
    try {
      const { data: managers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gerente');
      
        if (managers && managers.length > 0) {
        const notifications = managers.map((m: any) => ({
          user_id: m.user_id,
          type: 'vehicle_demand',
          title: '🚗 Nova demanda de veículo',
          message: `${customerName} procura ${vehicleBrand || ''} ${vehicleModel || 'veículo específico'} que não está em estoque`,
          link: '/crm/follow-up?tab=perdas',
        }));
        
        await supabase.from('notifications').insert(notifications);
        console.log('[Vehicle Interest Alert] Notified', managers.length, 'managers');
      }
    } catch (e) {
      console.error('[Vehicle Interest Alert] Error notifying managers:', e);
    }
    
  } catch (error) {
    console.error('[Vehicle Interest Alert] Error in detectAndCreateVehicleInterestAlert:', error);
  }
}
