import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEvolutionMessage(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string,
): Promise<boolean> {
  try {
    let formatted = phone.replace(/\D/g, '');
    if (!formatted.startsWith('55')) formatted = '55' + formatted;
    if (formatted.length < 12) return false;

    const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({ number: formatted, text: message }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[notify] Evolution error:', err);
    }
    return res.ok;
  } catch (e) {
    console.warn('[notify] sendEvolutionMessage failed:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lead_id, salesperson_id } = await req.json();

    if (!lead_id || !salesperson_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id and salesperson_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch everything in parallel
    const [leadRes, spRes, instanceRes, authRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, name, phone, vehicle_interest, qualification_status')
        .eq('id', lead_id)
        .single(),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', salesperson_id)
        .single(),
      supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected')
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.auth.admin.getUserById(salesperson_id),
    ]);

    const lead = leadRes.data;
    const salesperson = spRes.data;
    const instance = instanceRes.data;
    // Phone from auth (most reliable source)
    const salespersonPhone = authRes.data?.user?.phone ?? null;

    if (!lead || !salesperson) {
      return new Response(
        JSON.stringify({ error: 'Lead or salesperson not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance) {
      console.log('[notify] No connected WhatsApp instance, skipping.');
      return new Response(
        JSON.stringify({ success: false, warning: 'No WhatsApp instance connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const evolutionUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') ?? '';
    const apiUrl = evolutionUrl || instance.api_url;
    const apiKey = evolutionKey || instance.api_key;
    const isQualified = lead.qualification_status === 'qualificado';

    const results: Record<string, boolean> = {};

    // 1. Notify salesperson via their registered phone
    if (salespersonPhone) {
      const interestLine = lead.vehicle_interest ? `\n🚗 Interesse: ${lead.vehicle_interest}` : '';
      const qualifiedLine = isQualified ? '\n✅ Lead qualificado pelo IA' : '';
      const msg =
        `🎯 *Novo lead atribuído a você!*\n\nNome: *${lead.name}*\nTelefone: ${lead.phone}${interestLine}${qualifiedLine}\n\nEntre em contato o quanto antes! 🚀`;
      results.salesperson = await sendEvolutionMessage(apiUrl, apiKey, instance.instance_name, salespersonPhone, msg);
    } else {
      console.log('[notify] Salesperson has no phone registered in auth, skipping salesperson notification.');
      results.salesperson = false;
    }

    // 2. Notify lead — only when qualified
    if (lead.phone && isQualified) {
      const spName = salesperson.full_name || 'nosso consultor';
      const msg =
        `Olá ${lead.name}! 😊\n\nSeu atendimento na *Matheus Veículos* foi iniciado!\n\nSeu consultor *${spName}* entrará em contato com você em breve pelo WhatsApp.\n\nAguarde, estamos te esperando! 🚗`;
      results.lead = await sendEvolutionMessage(apiUrl, apiKey, instance.instance_name, lead.phone, msg);
    } else {
      results.lead = false;
    }

    console.log('[notify-lead-assignment] Done:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notify-lead-assignment] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
