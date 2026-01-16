import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant data from database
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Parallel data fetching
    const [salesRes, leadsRes, negotiationsRes, vehiclesRes, profilesRes] = await Promise.all([
      supabase.from('sales')
        .select('id, sale_price, sale_date, salesperson_id, status')
        .gte('sale_date', formatDate(thirtyDaysAgo))
        .eq('status', 'concluida'),
      supabase.from('leads')
        .select('id, source, qualification_status, created_at, first_response_at, assigned_to')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('negotiations')
        .select('id, lead_id, status, appointment_date, showed_up, salesperson_id')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('vehicles')
        .select('id, brand, model, year, purchase_price, sale_price, status'),
      supabase.from('profiles')
        .select('id, full_name'),
    ]);

    const sales = salesRes.data || [];
    const leads = leadsRes.data || [];
    const negotiations = negotiationsRes.data || [];
    const vehicles = vehiclesRes.data || [];
    const profiles = profilesRes.data || [];

    // Build context for AI
    const context = {
      periodo: `${formatDate(thirtyDaysAgo)} a ${formatDate(today)}`,
      vendas: {
        total: sales.length,
        receitaTotal: sales.reduce((sum, s) => sum + (s.sale_price || 0), 0),
        ticketMedio: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.sale_price || 0), 0) / sales.length : 0,
        ultimaSemana: sales.filter(s => new Date(s.sale_date) >= sevenDaysAgo).length,
      },
      leads: {
        total: leads.length,
        qualificados: leads.filter(l => l.qualification_status === 'qualificado').length,
        porOrigem: leads.reduce((acc: Record<string, number>, l) => {
          const source = l.source || 'outros';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {}),
        semResposta: leads.filter(l => !l.first_response_at).length,
      },
      negociacoes: {
        total: negotiations.length,
        comAgendamento: negotiations.filter(n => n.appointment_date).length,
        compareceram: negotiations.filter(n => n.showed_up === true).length,
        perdidas: negotiations.filter(n => n.status === 'perdida').length,
      },
      estoque: {
        total: vehicles.length,
        disponiveis: vehicles.filter(v => v.status === 'disponivel').length,
        vendidos: vehicles.filter(v => v.status === 'vendido').length,
      },
      vendedores: profiles.map(p => ({
        nome: p.full_name,
        vendas: sales.filter(s => s.salesperson_id === p.id).length,
        receita: sales.filter(s => s.salesperson_id === p.id).reduce((sum, s) => sum + (s.sale_price || 0), 0),
      })).filter(v => v.vendas > 0).sort((a, b) => b.vendas - a.vendas),
    };

    const systemPrompt = `Você é um assistente especializado em análise de dados de uma concessionária de veículos. 
Você tem acesso aos seguintes dados atualizados:

${JSON.stringify(context, null, 2)}

Baseado nestes dados, responda às perguntas do usuário de forma clara e objetiva.
Sempre que possível, inclua números específicos e insights acionáveis.

IMPORTANTE: Sua resposta deve ser em JSON com a seguinte estrutura:
{
  "content": "Texto da resposta em linguagem natural",
  "report": {
    "title": "Título do Relatório",
    "period": { "from": "data inicial", "to": "data final" },
    "kpis": [
      { "label": "Nome do KPI", "value": "Valor", "trend": "up|down|stable" }
    ],
    "sections": [
      { "title": "Título da seção", "content": "Conteúdo detalhado" }
    ],
    "insights": [
      "Insight 1",
      "Insight 2"
    ],
    "generatedAt": "${new Date().toISOString()}"
  }
}

Se a pergunta for simples e não precisar de um relatório completo, use apenas "content".
Para análises mais detalhadas, inclua o objeto "report" completo.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Try to parse as JSON
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch {
      // If not JSON, return as plain content
      result = { content };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-report:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
