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

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const { event, data, instance } = payload;

    const normalizedEvent = (event || '').toLowerCase().replace(/_/g, '.');

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
        console.log('Unhandled event:', event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// =============================================
// HANDLE NEW MESSAGE
// =============================================
async function handleNewMessage(supabase: any, data: any, instanceName: string, payload: any) {
  const message = data;
  const fromMe = message.key?.fromMe;
  const messageId = message.key?.id;
  const pushName = message.pushName || 'Cliente';

  const { phone, remoteJidToStore } = extractPhoneAndJid(message, payload);
  const remoteJid = message.key?.remoteJid;

  // Extract message content
  const { messageText, messageType } = extractMessageContent(message);

  console.log('Processing message:', { phone, fromMe, messageType, content: messageText?.substring(0, 50), messageId });

  // Skip outgoing messages for AI processing
  if (fromMe) {
    await processOutgoingMessage(supabase, message, instanceName, phone, remoteJidToStore, messageText || '', messageId);
    return;
  }

  // =============================================
  // FIND WHATSAPP INSTANCE
  // =============================================
  const { data: whatsappInstance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('id, instance_name')
    .eq('instance_name', instanceName)
    .single();

  if (instanceError || !whatsappInstance) {
    console.error('Instance not found:', instanceName, instanceError?.message);
    return;
  }

  // ===========================================
  // GABI DESATIVADA - Kill switch manual
  // Para reativar, remova este bloco e descomente o código abaixo
  // ===========================================
  const linkedAgent = null;
  const isAIInstance = false;
  console.log('[KILL SWITCH] Gabi está DESATIVADA. Mensagens serão apenas salvas, sem resposta da IA.');

  // Check if this instance has an AI agent linked to it
  // const { data: linkedAgent } = await supabase
  //   .from('ai_agents')
  //   .select('id, whatsapp_auto_reply')
  //   .eq('whatsapp_instance_id', whatsappInstance.id)
  //   .eq('status', 'active')
  //   .limit(1)
  //   .maybeSingle();

  // const isAIInstance = !!(linkedAgent && linkedAgent.whatsapp_auto_reply);

  // =============================================
  // MESSAGE DEDUPLICATION
  // =============================================
  const { data: existingMsg } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('message_id', messageId)
    .eq('direction', 'incoming')
    .limit(1)
    .maybeSingle();

  if (existingMsg) {
    console.log('Message already processed, skipping:', messageId);
    return;
  }

  // =============================================
  // PHONE LOCK (replaces debounce)
  // =============================================
  let phoneLockAcquired = false;
  if (isAIInstance && phone) {
    const { data: lockResult, error: lockError } = await supabase
      .rpc('acquire_phone_lock', { p_phone: phone, p_lock_duration_seconds: 90 });

    if (lockError || !lockResult) {
      console.log('Phone lock NOT acquired for:', phone, '- saving message only');
      // Still save message even if locked
      await saveIncomingMessage(supabase, whatsappInstance, phone, pushName, instanceName, messageText, messageType, messageId, remoteJidToStore || remoteJid, null);
      return;
    }
    phoneLockAcquired = true;
    console.log('Phone lock acquired for:', phone);
  }

  try {
    // =============================================
    // SELLER INSTANCE: ONLY SAVE MESSAGE, NO CRM
    // =============================================
    if (!isAIInstance) {
      console.log('Seller instance - saving message only, NO lead/CRM processing');
      // Only save the raw message for the WhatsApp chat panel
      const contact = phone ? await findOrCreateContact(supabase, phone, pushName, null) : null;
      await supabase.from('whatsapp_messages').insert({
        instance_id: whatsappInstance.id,
        contact_id: contact?.id,
        remote_jid: remoteJidToStore || remoteJid || `${phone}@s.whatsapp.net`,
        message_id: messageId,
        direction: 'incoming',
        message_type: messageType,
        content: messageText || '[Media]',
        status: 'delivered',
        lead_id: null, // NEVER link to leads on seller instances
      });
      if (contact) {
        await supabase.from('whatsapp_contacts').update({
          last_message_at: new Date().toISOString(),
          unread_count: (contact.unread_count || 0) + 1,
          name: pushName || undefined,
        }).eq('id', contact.id);
      }
      return; // STOP HERE - no leads, no negotiations, no AI
    }

    // =============================================
    // AI INSTANCE: FULL CRM PROCESSING
    // =============================================
    let leadId = phone ? await findLeadIdByPhone(supabase, phone) : null;

    if (!leadId && phone) {
      const origin = await detectLeadOrigin(supabase, messageText || '');
      console.log('[Lead Origin] Detected:', origin);
      leadId = await createLeadWithRoundRobin(supabase, phone, pushName, origin);
      console.log('Created lead:', leadId);
    } else if (leadId) {
      // Update lead name from pushName if placeholder
      const { data: existingLead } = await supabase.from('leads').select('name, source').eq('id', leadId).single();
      if (existingLead?.name?.includes('Lead WhatsApp') || existingLead?.name?.includes('Lead ')) {
        if (pushName && pushName !== 'Cliente') {
          await supabase.from('leads').update({ name: pushName, updated_at: new Date().toISOString() }).eq('id', leadId);
        }
      }
      // Check origin upgrade for first few messages
      if (existingLead?.source === 'whatsapp') {
        const origin = await detectLeadOrigin(supabase, messageText || '');
        if (origin.source !== 'whatsapp') {
          await supabase.from('leads').update({
            source: origin.source,
            meta_campaign_id: origin.meta_campaign_id,
            updated_at: new Date().toISOString(),
          }).eq('id', leadId);
        }
      }
      await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
    }

    // Find or create contact
    let contact = await findOrCreateContact(supabase, phone || '', pushName, leadId);

    // Save incoming message
    await saveIncomingMessage(supabase, whatsappInstance, phone, pushName, instanceName, messageText, messageType, messageId, remoteJidToStore || remoteJid, contact?.lead_id || leadId);

    // Update contact
    if (contact) {
      await supabase.from('whatsapp_contacts').update({
        last_message_at: new Date().toISOString(),
        unread_count: (contact.unread_count || 0) + 1,
        lead_id: contact.lead_id || leadId || null,
        name: pushName || undefined,
      }).eq('id', contact.id);
    }

    // Create notification for incoming message
    if (leadId) {
      const { data: lead } = await supabase.from('leads').select('assigned_to, name').eq('id', leadId).single();
      if (lead?.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          type: 'whatsapp_message',
          title: 'Nova mensagem WhatsApp',
          message: `${lead.name}: ${(messageText || '').substring(0, 100)}`,
          link: '/whatsapp',
        });
      }
    }

    // Save lead interaction
    if (leadId) {
      await supabase.from('lead_interactions').insert({
        lead_id: leadId,
        type: 'whatsapp',
        description: `Mensagem recebida: ${(messageText || '').substring(0, 200)}`,
      });
    }

    // Check negotiation stage & reactivation
    await handleNegotiationStage(supabase, leadId);

    // Check human takeover
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('whatsapp_instance_id', whatsappInstance.id)
      .eq('status', 'active')
      .eq('whatsapp_auto_reply', true)
      .single();

    if (!agent) {
      console.log('No active AI agent for instance:', whatsappInstance.id);
      return;
    }

    // Check human takeover
    const sessionId = `whatsapp_${phone}_${new Date().toISOString().split('T')[0]}`;
    const { data: conversation } = await supabase
      .from('ai_agent_conversations')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (conversation) {
      const { data: takeover } = await supabase
        .from('ai_agent_human_takeover')
        .select('id')
        .eq('conversation_id', conversation.id)
        .is('resolved_at', null)
        .single();

      if (takeover) {
        console.log('Human takeover active - skipping AI');
        return;
      }
    }

    // Check transfer keywords
    if (agent.transfer_to_human_enabled && agent.transfer_keywords?.length > 0) {
      const lowerContent = (messageText || '').toLowerCase();
      if (agent.transfer_keywords.some((kw: string) => lowerContent.includes(kw.toLowerCase()))) {
        console.log('Transfer keyword detected');
        const targetJid = remoteJidToStore || remoteJid || `${phone}@s.whatsapp.net`;
        await sendWhatsAppMessage(instanceName, targetJid, 'Entendi! Vou transferir voce para um dos nossos atendentes. Em breve alguem entra em contato.');
        return;
      }
    }

    // =============================================
    // TRANSCRIBE AUDIO IF NEEDED
    // =============================================
    let actualMessage = messageText || '';
    let shouldRespondWithAudio = false;

    if (messageType === 'audio' || actualMessage === '[Áudio]') {
      console.log('Audio message detected, transcribing...');
      const transcription = await transcribeWhatsAppAudio(instanceName, messageId);
      if (transcription) {
        actualMessage = transcription;
        shouldRespondWithAudio = true;
      } else {
        actualMessage = '[O cliente enviou um audio que nao foi possivel transcrever. Peca para repetir por texto.]';
      }
    } else if (messageType === 'image') {
      // Download and save image for trade-in context
      const savedUrl = await downloadAndSaveImage(supabase, instanceName, messageId, phone || '');
      actualMessage = `[O cliente enviou uma foto.${savedUrl ? ` Foto salva em: ${savedUrl}` : ''}]`;
    }

    // =============================================
    // CALL AI-AGENT-CHAT EDGE FUNCTION
    // =============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    console.log(`AI Agent "${agent.name}" processing message`);
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-agent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        agent_id: agent.id,
        message: actualMessage,
        phone,
        lead_id: leadId,
        channel: 'whatsapp',
        customer_name: pushName,
        is_audio_input: shouldRespondWithAudio,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Agent error:', await aiResponse.text());
      return;
    }

    const aiData = await aiResponse.json();
    const responseMessage = aiData.message ?? aiData.response ?? '';

    const rawPhotos = aiData.photos ?? aiData.images ?? [];
    const photos: Array<{ url: string; caption: string }> = Array.isArray(rawPhotos)
      ? rawPhotos
          .map((photo: unknown) => {
            if (typeof photo === 'string') {
              return { url: photo, caption: '' };
            }

            if (photo && typeof photo === 'object' && 'url' in photo) {
              const parsed = photo as { url?: string; caption?: string };
              if (parsed.url) {
                return { url: parsed.url, caption: parsed.caption || '' };
              }
            }

            return null;
          })
          .filter((photo): photo is { url: string; caption: string } => photo !== null)
      : [];

    if (!responseMessage && photos.length === 0) {
      console.log('No response from AI - empty message and no photos');
      return;
    }

    console.log('[webhook] AI response ready. Text length:', responseMessage?.length, 'Photos:', photos.length);

    // =============================================
    // SEND RESPONSE VIA WHATSAPP
    // =============================================
    const targetJid = remoteJidToStore || remoteJid || `${phone}@s.whatsapp.net`;

    // Send photos first (if any)
    if (photos.length > 0) {
      for (const photo of photos) {
        await sendWhatsAppImage(instanceName, targetJid, photo.url, photo.caption);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Send text response split by |||
    if (responseMessage) {
      if (shouldRespondWithAudio && agent.enable_voice && agent.elevenlabs_api_key) {
        const audioSent = await sendWhatsAppAudioResponse(instanceName, targetJid, responseMessage, agent.elevenlabs_api_key, agent.voice_id || 'nPczCjzI2devNBz1zQrb');
        if (!audioSent) {
          await sendTextInBalloons(instanceName, targetJid, responseMessage);
        }
      } else {
        await sendTextInBalloons(instanceName, targetJid, responseMessage);
      }
    }

    // Save outgoing message
    await supabase.from('whatsapp_messages').insert({
      instance_id: whatsappInstance.id,
      contact_id: contact?.id,
      remote_jid: targetJid,
      message_id: `ai_${Date.now()}`,
      direction: 'outgoing',
      message_type: photos.length > 0 ? 'image' : 'text',
      content: responseMessage,
      status: 'sent',
      lead_id: leadId,
    });

    // Update metrics
    await updateAgentMetrics(supabase, agent.id);

  } finally {
    // ALWAYS release phone lock
    if (phoneLockAcquired && phone) {
      await supabase.rpc('release_phone_lock', { p_phone: phone });
      console.log('Phone lock released for:', phone);
    }
  }
}

// =============================================
// SEND TEXT IN BALLOONS (split by |||)
// =============================================
async function sendTextInBalloons(instanceName: string, targetJid: string, text: string): Promise<void> {
  const parts = text.split('|||').map(p => p.trim()).filter(p => p.length > 0).slice(0, 3);

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, 1500));
    }
    await sendWhatsAppMessage(instanceName, targetJid, parts[i]);
  }
}

// =============================================
// NEGOTIATION STAGE MANAGEMENT
// =============================================
async function handleNegotiationStage(supabase: any, leadId: string | null) {
  if (!leadId) return;

  const { data: negotiation } = await supabase
    .from('negotiations')
    .select('id, status, salesperson_id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!negotiation) {
    // Auto-create negotiation
    const { data: lead } = await supabase.from('leads').select('assigned_to').eq('id', leadId).single();
    await supabase.from('negotiations').insert({
      lead_id: leadId,
      salesperson_id: lead?.assigned_to || null,
      status: 'atendimento_ia',
      last_message_at: new Date().toISOString(),
      notes: 'Negociacao criada automaticamente',
    });
    return;
  }

  // Reactivation from follow_up or perdido
  if (['follow_up', 'perdido'].includes(negotiation.status)) {
    console.log('Lead reactivating from', negotiation.status);
    await supabase.from('negotiations').update({
      status: 'atendimento_ia',
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', negotiation.id);

    await supabase.from('leads').update({ status: 'reativado', updated_at: new Date().toISOString() }).eq('id', leadId);

    await supabase.from('lead_follow_up_tracking').update({
      status: 'paused', updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).in('status', ['active', 'pending']);

    if (negotiation.salesperson_id) {
      const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
      await supabase.from('notifications').insert({
        user_id: negotiation.salesperson_id,
        type: 'lead_reactivated',
        title: 'Lead reativado!',
        message: `${lead?.name || 'Lead'} respondeu e voltou ao pipeline!`,
        link: '/crm',
      });
    }
  } else {
    // Update last_message_at
    await supabase.from('negotiations').update({
      last_message_at: new Date().toISOString(),
    }).eq('id', negotiation.id);

    // Notify salesperson for active negotiations
    if (['negociando', 'ganho'].includes(negotiation.status) && negotiation.salesperson_id) {
      const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
      await supabase.from('notifications').insert({
        user_id: negotiation.salesperson_id,
        type: 'whatsapp_message',
        title: 'Nova mensagem do lead',
        message: `${lead?.name || 'Lead'} enviou uma mensagem`,
        link: '/whatsapp',
      });
    }
  }
}

// =============================================
// SAVE INCOMING MESSAGE
// =============================================
async function saveIncomingMessage(supabase: any, instance: any, phone: string | null, pushName: string, instanceName: string, content: string | null, messageType: string, messageId: string, remoteJid: string | null, leadId: string | null) {
  const contact = phone ? await findOrCreateContact(supabase, phone, pushName, leadId) : null;
  await supabase.from('whatsapp_messages').insert({
    instance_id: instance.id,
    contact_id: contact?.id,
    remote_jid: remoteJid || `${phone}@s.whatsapp.net`,
    message_id: messageId,
    direction: 'incoming',
    message_type: messageType,
    content: content || '[Media]',
    status: 'delivered',
    lead_id: contact?.lead_id || leadId,
  });
}

// =============================================
// FIND OR CREATE CONTACT
// =============================================
async function findOrCreateContact(supabase: any, phone: string, name: string, leadId: string | null) {
  const { data: existing } = await supabase
    .from('whatsapp_contacts')
    .select('id, lead_id, unread_count, phone')
    .eq('phone', phone)
    .single();

  if (existing) return existing;

  const { data: newContact } = await supabase
    .from('whatsapp_contacts')
    .insert({ phone, name, lead_id: leadId || null, unread_count: 0 })
    .select()
    .single();

  return newContact;
}

// =============================================
// EXTRACT MESSAGE CONTENT
// =============================================
function extractMessageContent(data: any) {
  const msg = data.message;
  if (!msg) return { messageText: null, messageType: 'text' };
  if (msg.conversation) return { messageText: msg.conversation, messageType: 'text' };
  if (msg.extendedTextMessage?.text) return { messageText: msg.extendedTextMessage.text, messageType: 'text' };
  if (msg.imageMessage) return { messageText: msg.imageMessage.caption || '[Imagem]', messageType: 'image' };
  // Handle all audio variants: audioMessage, pttMessage (push-to-talk), and senderKeyDistributionMessage with audio
  if (msg.audioMessage || msg.pttMessage || msg.ptt) return { messageText: '[Áudio]', messageType: 'audio' };
  if (msg.videoMessage) return { messageText: msg.videoMessage.caption || '[Video]', messageType: 'video' };
  if (msg.documentMessage) return { messageText: msg.documentMessage.fileName || '[Documento]', messageType: 'document' };
  if (msg.stickerMessage) return { messageText: '[Sticker]', messageType: 'sticker' };
  if (msg.contactMessage || msg.contactsArrayMessage) return { messageText: '[Contato]', messageType: 'contact' };
  if (msg.locationMessage || msg.liveLocationMessage) return { messageText: '[Localizacao]', messageType: 'location' };
  return { messageText: null, messageType: 'text' };
}

// =============================================
// PHONE/JID EXTRACTION
// =============================================
function normalizePhone(input?: string): string | null {
  if (!input) return null;
  const cleaned = input.split('@')[0];
  const digits = cleaned.replace(/\D/g, '');
  if (!digits || digits.length < 10) return null;
  if (digits.startsWith('1') && digits.length > 13) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function extractPhoneAndJid(message: any, payload: any): { phone: string | null; remoteJidToStore?: string } {
  const remoteJid = message?.key?.remoteJid;
  const remoteJidAlt = message?.key?.remoteJidAlt;
  const sender = payload?.sender;
  const participant = message?.key?.participant;
  const fromMe = message?.key?.fromMe === true;

  let phoneCandidate: string | null = null;
  let bestJid: string | undefined;

  if (!fromMe && remoteJid && !remoteJid.endsWith('@lid')) {
    phoneCandidate = normalizePhone(remoteJid);
    bestJid = remoteJid;
  }
  if (!phoneCandidate && remoteJidAlt && !remoteJidAlt.endsWith('@lid')) {
    phoneCandidate = normalizePhone(remoteJidAlt);
    bestJid = remoteJidAlt;
  }
  if (!phoneCandidate && participant && !participant.endsWith('@lid')) {
    phoneCandidate = normalizePhone(participant);
    bestJid = participant;
  }
  if (!phoneCandidate && sender && !sender.endsWith('@lid')) {
    phoneCandidate = normalizePhone(sender);
    bestJid = sender;
  }

  const remoteJidToStore = bestJid || (phoneCandidate ? `${phoneCandidate}@s.whatsapp.net` : undefined) || remoteJid;
  return { phone: phoneCandidate, remoteJidToStore };
}

// =============================================
// FIND LEAD BY PHONE
// =============================================
async function findLeadIdByPhone(supabase: any, formattedPhone: string): Promise<string | null> {
  const phoneNoCountry = formattedPhone.replace(/^55/, '');
  const candidates = [formattedPhone, phoneNoCountry, `+${formattedPhone}`, `+${phoneNoCountry}`];

  for (const c of candidates) {
    if (!c) continue;
    const { data } = await supabase.from('leads').select('id').eq('phone', c).limit(1).maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

// =============================================
// CREATE LEAD WITH ROUND ROBIN
// =============================================
async function createLeadWithRoundRobin(supabase: any, phone: string, name: string, origin: any): Promise<string | null> {
  const { data: newLead, error } = await supabase.from('leads').insert({
    name: name || `Lead WhatsApp ${phone.slice(-4)}`,
    phone,
    source: origin.source || 'whatsapp',
    meta_campaign_id: origin.meta_campaign_id || null,
    status: 'novo',
    notes: `Lead criado automaticamente via WhatsApp`,
  }).select().single();

  if (error || !newLead) {
    console.error('Error creating lead:', error);
    return null;
  }

  // Round Robin assignment
  const { data: nextSalesperson } = await supabase.rpc('get_next_round_robin_salesperson');
  if (nextSalesperson) {
    await supabase.from('leads').update({ assigned_to: nextSalesperson }).eq('id', newLead.id);
    await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: nextSalesperson });
    await supabase.from('lead_assignments').insert({
      lead_id: newLead.id,
      salesperson_id: nextSalesperson,
      assignment_type: 'round_robin',
      notes: 'Atribuído automaticamente via WhatsApp',
    });
  }

  // Create negotiation
  await supabase.from('negotiations').insert({
    lead_id: newLead.id,
    salesperson_id: nextSalesperson || null,
    status: 'atendimento_ia',
    last_message_at: new Date().toISOString(),
    notes: 'Negociação criada automaticamente via WhatsApp',
    probability: 20,
  });

  return newLead.id;
}

// =============================================
// DETECT LEAD ORIGIN (Meta Ads etc)
// =============================================
async function detectLeadOrigin(supabase: any, firstMessage: string): Promise<{ source: string; meta_campaign_id: string | null }> {
  if (!firstMessage) return { source: 'whatsapp', meta_campaign_id: null };

  const campaignPatterns = [
    /vi\s+(seu|o|esse)\s+an[uú]ncio/i,
    /interesse\s+(no|nesse)\s+an[uú]ncio/i,
    /vi\s+no\s+(facebook|instagram|face|insta)/i,
    /an[uú]ncio\s+(do|da|de|sobre)/i,
    /cliquei\s+no\s+an[uú]ncio/i,
    /vim\s+(pelo|do|por)\s+(anuncio|instagram|facebook|face|insta|meta|ads)/i,
    /gostaria\s+de\s+saber\s+mais/i,
    /tenho\s+interesse/i,
    /esse\s+(carro|veículo|veiculo)\s+(ainda\s+)?(está|ta)\s+disponível/i,
    /ainda\s+(está|ta)\s+disponível/i,
  ];

  const isCampaign = campaignPatterns.some(p => p.test(firstMessage));
  if (isCampaign) {
    // Try to detect platform
    const isInstagram = /instagram|insta/i.test(firstMessage);
    return {
      source: isInstagram ? 'instagram' : 'facebook',
      meta_campaign_id: null,
    };
  }

  return { source: 'whatsapp', meta_campaign_id: null };
}

// =============================================
// SEND WHATSAPP MESSAGE
// =============================================
async function sendWhatsAppMessage(instanceName: string, remoteJid: string, message: string): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!evolutionUrl || !evolutionApiKey) return false;

  try {
    const baseUrl = evolutionUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: remoteJid, text: message }),
    });
    if (!response.ok) {
      console.error('Error sending WhatsApp:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Send error:', error);
    return false;
  }
}

// =============================================
// SEND WHATSAPP IMAGE
// =============================================
async function sendWhatsAppImage(instanceName: string, remoteJid: string, imageUrl: string, caption?: string): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!evolutionUrl || !evolutionApiKey) {
    console.error('[sendImage] Evolution API not configured');
    return false;
  }

  try {
    const baseUrl = evolutionUrl.replace(/\/$/, '');
    console.log('[sendImage] Sending to:', remoteJid, 'URL:', imageUrl.substring(0, 80));
    
    const response = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: remoteJid, mediatype: 'image', media: imageUrl, caption: caption || '' }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('[sendImage] Evolution API error:', response.status, errText);
      
      // Retry with fileName for compatibility with some Evolution versions
      console.log('[sendImage] Retrying with alternative payload...');
      const retryResponse = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({ 
          number: remoteJid, 
          mediatype: 'image', 
          media: imageUrl, 
          caption: caption || '',
          fileName: 'veiculo.jpg',
        }),
      });
      
      if (!retryResponse.ok) {
        console.error('[sendImage] Retry also failed:', await retryResponse.text());
        return false;
      }
      console.log('[sendImage] Retry succeeded');
      return true;
    }
    
    console.log('[sendImage] Success');
    return true;
  } catch (error) {
    console.error('[sendImage] Exception:', error);
    return false;
  }
}

// =============================================
// DOWNLOAD AND SAVE IMAGE (for trade-in)
// =============================================
async function downloadAndSaveImage(supabase: any, instanceName: string, messageId: string, phone: string): Promise<string | null> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!evolutionUrl || !evolutionApiKey) return null;

  try {
    const baseUrl = evolutionUrl.replace(/\/$/, '');
    const mediaResponse = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    });

    if (!mediaResponse.ok) return null;

    const mediaData = await mediaResponse.json();
    if (!mediaData.base64) return null;

    const binaryStr = atob(mediaData.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const filePath = `trade-in/${phone}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(filePath, bytes, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) return null;

    const { data: publicUrlData } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  } catch {
    return null;
  }
}

// =============================================
// TRANSCRIBE AUDIO
// =============================================
async function transcribeWhatsAppAudio(instanceName: string, messageId: string): Promise<string | null> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) { console.error('[transcribe] OPENAI_API_KEY not set'); return null; }
  if (!evolutionUrl || !evolutionApiKey) { console.error('[transcribe] Evolution API not configured'); return null; }

  try {
    const baseUrl = evolutionUrl.replace(/\/$/, '');
    console.log('[transcribe] Fetching audio base64 for messageId:', messageId);
    
    const mediaResponse = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
    });

    if (!mediaResponse.ok) {
      const errText = await mediaResponse.text();
      console.error('[transcribe] Evolution media fetch failed:', mediaResponse.status, errText);
      return null;
    }
    
    const mediaData = await mediaResponse.json();
    if (!mediaData.base64) {
      console.error('[transcribe] No base64 in Evolution response. Keys:', Object.keys(mediaData));
      return null;
    }

    console.log('[transcribe] Got base64 audio, length:', mediaData.base64.length);
    
    const binaryStr = atob(mediaData.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    
    // Detect mime type from Evolution response or default to ogg
    const mimeType = mediaData.mimetype || 'audio/ogg';
    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg';
    const audioBlob = new Blob([bytes], { type: mimeType });

    console.log('[transcribe] Audio blob created:', bytes.length, 'bytes, type:', mimeType);

    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[transcribe] Whisper API error:', response.status, errText);
      return null;
    }
    
    const data = await response.json();
    console.log('[transcribe] Success! Text:', data.text?.substring(0, 80));
    return data.text || null;
  } catch (error) {
    console.error('[transcribe] Exception:', error);
    return null;
  }
}

// =============================================
// TTS AUDIO RESPONSE
// =============================================
async function sendWhatsAppAudioResponse(instanceName: string, remoteJid: string, text: string, elevenLabsApiKey: string, voiceId: string): Promise<boolean> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!evolutionUrl || !evolutionApiKey) return false;

  try {
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 } }),
    });

    if (!ttsResponse.ok) return false;
    const audioBuffer = await ttsResponse.arrayBuffer();

    const fileName = `tts-${Date.now()}.mp3`;
    await fetch(`${supabaseUrl}/storage/v1/object/vehicle-images/ai-audio/${fileName}`, {
      method: 'POST',
      headers: { 'apikey': supabaseKey!, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
      body: new Uint8Array(audioBuffer),
    });

    const audioUrl = `${supabaseUrl}/storage/v1/object/public/vehicle-images/ai-audio/${fileName}`;
    const baseUrl = evolutionUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: remoteJid, audio: audioUrl }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// =============================================
// PROCESS OUTGOING MESSAGE
// =============================================
async function processOutgoingMessage(supabase: any, message: any, instanceName: string, phone: string | null, remoteJidToStore: string | undefined, content: string, messageId: string) {
  const remoteJid = message.key?.remoteJid;
  let contact: any = null;

  if (phone) {
    const { data } = await supabase.from('whatsapp_contacts').select('id, lead_id').eq('phone', phone).single();
    contact = data;
  }

  const { data: instance } = await supabase.from('whatsapp_instances').select('id').eq('instance_name', instanceName).single();

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

  if (contact) {
    await supabase.from('whatsapp_contacts').update({ unread_count: 0 }).eq('id', contact.id);
  }
}

// =============================================
// UPDATE AGENT METRICS
// =============================================
async function updateAgentMetrics(supabase: any, agentId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('ai_agent_metrics').select('id, conversations_count').eq('agent_id', agentId).eq('date', today).single();

  if (existing) {
    await supabase.from('ai_agent_metrics').update({ conversations_count: (existing.conversations_count || 0) + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('ai_agent_metrics').insert({ agent_id: agentId, date: today, conversations_count: 1 });
  }
}

// =============================================
// EVENT HANDLERS
// =============================================
async function handleMessageUpdate(supabase: any, data: any) {
  const keyId = data?.keyId || data?.key?.id;
  if (!keyId) return;
  const rawStatus = data?.status ?? data?.update?.status;
  const numMap: Record<number, string> = { 2: 'sent', 3: 'delivered', 4: 'read' };
  const strMap: Record<string, string> = { SERVER_ACK: 'sent', DELIVERY_ACK: 'delivered', READ: 'read', READ_ACK: 'read', FAILED: 'failed' };
  const status = typeof rawStatus === 'number' ? numMap[rawStatus] : typeof rawStatus === 'string' ? strMap[rawStatus] : undefined;
  if (status) await supabase.from('whatsapp_messages').update({ status }).eq('message_id', keyId);
}

async function handleConnectionUpdate(supabase: any, data: any, instanceName: string) {
  const statusMap: Record<string, string> = { open: 'connected', close: 'disconnected', connecting: 'connecting' };
  const status = statusMap[data?.state] || 'disconnected';
  await supabase.from('whatsapp_instances').update({ status }).eq('instance_name', instanceName);
}

async function handleQRCodeUpdate(supabase: any, data: any, instanceName: string) {
  await supabase.from('whatsapp_instances').update({
    qr_code: data?.qrcode?.base64,
    status: 'qr_code',
    qr_code_expires_at: new Date(Date.now() + 60000).toISOString(),
  }).eq('instance_name', instanceName);
}
