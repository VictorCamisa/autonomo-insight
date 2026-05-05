import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttemptDef {
  delay_hours: number;
  hint: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const log: string[] = [];
  const now = new Date();

  try {
    // 1. Buscar campanhas ativas
    const { data: campaigns } = await supabase
      .from("follow_up_campaigns")
      .select("*")
      .eq("is_active", true);

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ ok: true, log: ["no active campaigns"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const campaign of campaigns) {
      const attempts: AttemptDef[] = Array.isArray(campaign.attempts) ? campaign.attempts : [];
      if (!attempts.length) continue;

      // 2. Buscar negociações elegíveis (status alvo, sem ganho/perdido)
      const { data: negotiations } = await supabase
        .from("negotiations")
        .select(`id, lead_id, status, last_message_at, salesperson_id,
                 lead:leads(id, name, phone, vehicle_interest)`)
        .in("status", campaign.apply_to_statuses)
        .not("last_message_at", "is", null)
        .limit(500);

      if (!negotiations?.length) continue;

      for (const neg of negotiations) {
        const lead = neg.lead as any;
        if (!lead?.phone) continue;

        // Verifica se lead respondeu desde a última msg outgoing
        const lastOutgoing = new Date(neg.last_message_at).getTime();

        // Buscar tentativas já feitas
        const { data: previousAttempts } = await supabase
          .from("follow_up_attempts")
          .select("attempt_number, status, sent_at")
          .eq("negotiation_id", neg.id)
          .eq("campaign_id", campaign.id)
          .order("attempt_number", { ascending: true });

        // Se lead respondeu depois da última tentativa enviada, marca como respondido
        const lastSent = previousAttempts?.filter(a => a.status === "sent").pop();
        if (lastSent?.sent_at) {
          const { data: incomingSince } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("direction", "incoming")
            .gt("created_at", lastSent.sent_at)
            .limit(1);
          if (incomingSince?.length) {
            await supabase
              .from("follow_up_attempts")
              .update({ status: "responded" })
              .eq("negotiation_id", neg.id)
              .eq("campaign_id", campaign.id)
              .eq("status", "sent");
            continue; // lead respondeu, não envia mais
          }
        }

        const sentCount = previousAttempts?.filter(a => a.status === "sent").length ?? 0;

        // Esgotou tentativas?
        if (sentCount >= attempts.length) {
          // Já tratado?
          const { data: lastNote } = await supabase
            .from("negotiations")
            .select("notes")
            .eq("id", neg.id)
            .single();
          if (lastNote?.notes?.includes("[REPESCAGEM_ESGOTADA]")) continue;

          await handleExhausted(supabase, neg, campaign);
          log.push(`exhausted: ${neg.id}`);
          continue;
        }

        const nextAttemptIdx = sentCount; // 0-based
        const def = attempts[nextAttemptIdx];
        const referenceTime = sentCount === 0
          ? lastOutgoing
          : new Date(previousAttempts!.filter(a => a.status === "sent").pop()!.sent_at!).getTime();

        const dueAt = referenceTime + def.delay_hours * 3600 * 1000;
        if (now.getTime() < dueAt) continue; // ainda não é hora

        // 3. Gerar mensagem com IA + enviar
        const message = await generateFollowUpMessage(supabase, lead, def.hint, nextAttemptIdx + 1);
        if (!message) {
          log.push(`no message generated for ${neg.id}`);
          continue;
        }

        const sent = await sendWhatsApp(supabase, lead.phone, message);
        await supabase.from("follow_up_attempts").insert({
          campaign_id: campaign.id,
          negotiation_id: neg.id,
          lead_id: lead.id,
          attempt_number: nextAttemptIdx + 1,
          scheduled_for: new Date(dueAt).toISOString(),
          sent_at: sent ? now.toISOString() : null,
          status: sent ? "sent" : "failed",
          message_content: message,
          error_message: sent ? null : "send failed",
        });

        if (sent) {
          await supabase
            .from("negotiations")
            .update({ last_message_at: now.toISOString() })
            .eq("id", neg.id);
        }

        log.push(`sent attempt ${nextAttemptIdx + 1} to ${neg.id}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[follow-up-scheduler] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, log }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateFollowUpMessage(
  supabase: any,
  lead: any,
  hint: string,
  attemptNumber: number
): Promise<string | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    console.error("[follow-up] LOVABLE_API_KEY not set");
    return null;
  }

  // Buscar últimas msgs para contexto
  const { data: recent } = await supabase
    .from("whatsapp_messages")
    .select("content, direction, created_at")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const transcript = (recent || [])
    .reverse()
    .map((m: any) => `${m.direction === "incoming" ? "Cliente" : "Gabi"}: ${m.content}`)
    .join("\n");

  const prompt = `Voce e a Gabi, vendedora da Matheus Veiculos em Taubate/SP.
O cliente ${lead.name || ""} sumiu da conversa. Voce vai mandar UMA mensagem de repescagem (tentativa ${attemptNumber}).

REGRAS ABSOLUTAS:
- NUNCA usar emoji
- Dividir em 2 baloes com |||
- Maximo 200 caracteres por balao
- Tom leve, casual, brasileiro. Como pessoa real digitando no celular
- Nao parecer roteiro pronto. Variar abordagem.
- Nao revelar que e IA
- Sem "prezado", "estimado"
- Veiculo de interesse: ${lead.vehicle_interest || "nao especificado"}

ORIENTACAO PARA ESTA TENTATIVA: ${hint}

ULTIMAS MENSAGENS DA CONVERSA:
${transcript || "(sem historico)"}

Gere APENAS a mensagem final (com ||| separando os 2 baloes). Nada mais.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      console.error("[follow-up] Lovable AI error:", r.status, await r.text());
      return null;
    }
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[follow-up] generate error:", e);
    return null;
  }
}

async function sendWhatsApp(supabase: any, phone: string, message: string): Promise<boolean> {
  // Buscar instância de IA conectada
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("id, instance_name")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (!instance) return false;

  let p = phone.replace(/\D/g, "");
  if (p.length <= 11) p = "55" + p;

  try {
    const parts = message.split("|||").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      await supabase.functions.invoke("whatsapp-send", {
        body: { instance_id: instance.id, to: p, message: parts[i] },
      });
    }
    return true;
  } catch (e) {
    console.error("send error:", e);
    return false;
  }
}

async function handleExhausted(supabase: any, neg: any, campaign: any) {
  const tag = "[REPESCAGEM_ESGOTADA]";
  const action = campaign.on_exhausted;

  // Notify seller (sempre, conforme escolha do usuario)
  if (neg.salesperson_id) {
    await supabase.from("notifications").insert({
      user_id: neg.salesperson_id,
      type: "follow_up_exhausted",
      title: "Repescagem esgotada",
      message: `${neg.lead?.name || "Lead"} nao respondeu apos todas as tentativas.`,
      link: "/crm",
    });
  }

  const updates: any = {
    notes: `${tag} Tentativas esgotadas em ${new Date().toISOString()}`,
  };
  if (action === "mark_lost") updates.status = "perdido";

  await supabase.from("negotiations").update(updates).eq("id", neg.id);
}
