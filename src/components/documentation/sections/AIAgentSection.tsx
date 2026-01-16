import { SectionHeader } from "../ui/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Database, Cloud, Code2, Wrench, Shield, Settings, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "../ui/CodeBlock";

interface AIAgentSectionProps {
  searchTerm: string;
}

export const AIAgentSection = ({ searchTerm }: AIAgentSectionProps) => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Documentação Técnica - Módulo AI Agent"
        description="Guia completo para replicar o módulo de Agentes de IA em qualquer projeto Lovable"
        icon={Bot}
      />

      {/* Introdução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Visão Geral do Módulo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O módulo AI Agent é um sistema completo de chatbot com IA que permite criar, configurar e implantar 
            agentes inteligentes para atendimento automatizado via WhatsApp, widget web ou API. 
            O agente pode qualificar leads, consultar estoque, enviar fotos de veículos e transferir para humanos.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">12</div>
              <div className="text-xs text-muted-foreground">Tabelas</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">1</div>
              <div className="text-xs text-muted-foreground">Edge Function</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">9</div>
              <div className="text-xs text-muted-foreground">Páginas</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">3</div>
              <div className="text-xs text-muted-foreground">Canais</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. BANCO DE DADOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            1. Banco de Dados (Supabase)
          </CardTitle>
          <CardDescription>
            Execute estas migrations SQL no seu projeto Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Badge variant="outline">Tabela Principal: ai_agents</Badge>
            <CodeBlock language="sql" code={`-- Tabela principal de agentes
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT DEFAULT 'qualify_leads',
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'training')),
  
  -- Configuração LLM
  llm_provider TEXT DEFAULT 'openai' CHECK (llm_provider IN ('openai', 'google')),
  llm_model TEXT DEFAULT 'gpt-4o-mini',
  api_key_encrypted TEXT,
  api_endpoint TEXT,
  temperature NUMERIC DEFAULT 0.7,
  top_p NUMERIC DEFAULT 0.9,
  max_tokens INTEGER DEFAULT 2048,
  system_prompt TEXT,
  
  -- Configuração de Memória
  short_term_memory_type TEXT DEFAULT 'local',
  redis_host TEXT,
  redis_port INTEGER DEFAULT 6379,
  redis_password TEXT,
  redis_password_encrypted TEXT,
  context_window_size INTEGER DEFAULT 10,
  
  -- Memória de Longo Prazo (RAG)
  long_term_memory_enabled BOOLEAN DEFAULT false,
  vector_db_provider TEXT DEFAULT 'supabase',
  vector_db_config JSONB DEFAULT '{}',
  
  -- Configuração de Voz
  enable_voice BOOLEAN DEFAULT false,
  voice_id TEXT,
  voice_model TEXT,
  elevenlabs_api_key TEXT,
  
  -- Implantação
  deployment_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  embed_code TEXT,
  webhook_url TEXT,
  
  -- Integração WhatsApp
  whatsapp_instance_id TEXT,
  whatsapp_auto_reply BOOLEAN DEFAULT true,
  whatsapp_welcome_message TEXT,
  transfer_to_human_enabled BOOLEAN DEFAULT true,
  transfer_keywords TEXT[] DEFAULT ARRAY['falar com humano', 'atendente', 'vendedor']::TEXT[],
  
  -- Avatar
  avatar_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all agents" ON public.ai_agents FOR SELECT USING (true);
CREATE POLICY "Users can create agents" ON public.ai_agents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update agents" ON public.ai_agents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete agents" ON public.ai_agents FOR DELETE USING (auth.uid() IS NOT NULL);`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Tabela: ai_agent_tools</Badge>
            <CodeBlock language="sql" code={`-- Ferramentas/APIs que o agente pode usar
CREATE TABLE public.ai_agent_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL,
  endpoint_url TEXT,
  parameters JSONB,
  auth_method TEXT,
  auth_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agent_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tools" ON public.ai_agent_tools FOR ALL USING (true);`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Tabela: ai_agent_data_sources</Badge>
            <CodeBlock language="sql" code={`-- Fontes de dados (CRM, Estoque, FAQ)
CREATE TABLE public.ai_agent_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agent_data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data sources" ON public.ai_agent_data_sources FOR ALL USING (true);`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Tabela: ai_agent_conversations</Badge>
            <CodeBlock language="sql" code={`-- Histórico de conversas
CREATE TABLE public.ai_agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  lead_id UUID,
  customer_phone TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversations" ON public.ai_agent_conversations FOR ALL USING (true);`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Tabela: ai_agent_messages</Badge>
            <CodeBlock language="sql" code={`-- Mensagens individuais
CREATE TABLE public.ai_agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  thinking TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  audio_url TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages" ON public.ai_agent_messages FOR ALL USING (true);`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Tabelas Adicionais</Badge>
            <CodeBlock language="sql" code={`-- Guardrails (regras de segurança)
CREATE TABLE public.ai_agent_guardrails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  guardrail_type TEXT NOT NULL,
  config JSONB,
  violation_action TEXT DEFAULT 'block',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflows automatizados
CREATE TABLE public.ai_agent_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB,
  actions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Métricas diárias
CREATE TABLE public.ai_agent_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  successful_tool_calls INTEGER DEFAULT 0,
  failed_tool_calls INTEGER DEFAULT 0,
  human_takeovers INTEGER DEFAULT 0,
  satisfaction_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Testes automatizados
CREATE TABLE public.ai_agent_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_messages JSONB,
  expected_behaviors JSONB,
  last_run_at TIMESTAMPTZ,
  last_run_result TEXT,
  last_run_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notificações configuradas
CREATE TABLE public.ai_agent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold NUMERIC,
  channels TEXT[],
  recipients JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Takeover humano
CREATE TABLE public.ai_agent_human_takeover (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  reason TEXT,
  handled_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS em todas
ALTER TABLE public.ai_agent_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_human_takeover ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (ajuste conforme necessário)
CREATE POLICY "all_access" ON public.ai_agent_guardrails FOR ALL USING (true);
CREATE POLICY "all_access" ON public.ai_agent_workflows FOR ALL USING (true);
CREATE POLICY "all_access" ON public.ai_agent_metrics FOR ALL USING (true);
CREATE POLICY "all_access" ON public.ai_agent_tests FOR ALL USING (true);
CREATE POLICY "all_access" ON public.ai_agent_notifications FOR ALL USING (true);
CREATE POLICY "all_access" ON public.ai_agent_human_takeover FOR ALL USING (true);`} />
          </div>
        </CardContent>
      </Card>

      {/* 2. EDGE FUNCTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            2. Edge Function: ai-agent-chat
          </CardTitle>
          <CardDescription>
            Crie o arquivo supabase/functions/ai-agent-chat/index.ts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Badge variant="outline">Configuração config.toml</Badge>
            <CodeBlock language="toml" code={`[functions.ai-agent-chat]
verify_jwt = false`} />
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Código da Edge Function</Badge>
            <CodeBlock language="typescript" code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar áudio (opcional - ElevenLabs)
async function generateVoiceAudio(text: string, voiceId: string): Promise<string | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) return null;

  try {
    const response = await fetch(
      \`https://api.elevenlabs.io/v1/text-to-speech/\${voiceId}?output_format=mp3_44100_128\`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) return null;
    const audioBuffer = await response.arrayBuffer();
    return base64Encode(audioBuffer);
  } catch (error) {
    console.error('[ai-agent-chat] Voice error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agent_id, conversation_history = [], data_sources = [] } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca configuração do agente
    let agentConfig = null;
    if (agent_id) {
      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agent_id)
        .single();
      agentConfig = data;
    }

    // Busca dados do contexto (estoque, CRM, etc.)
    const contextData: Record<string, unknown> = {};
    
    // Exemplo: buscar veículos disponíveis
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, version, year_model, sale_price, color, km, images')
      .eq('status', 'disponivel')
      .limit(50);

    contextData.estoque = {
      total: vehicles?.length || 0,
      veiculos: vehicles?.map(v => ({
        veiculo: \`\${v.brand} \${v.model} \${v.version || ''} \${v.year_model}\`.trim(),
        preco: v.sale_price ? \`R$ \${Number(v.sale_price).toLocaleString('pt-BR')}\` : 'Consultar',
        cor: v.color,
        km: v.km ? \`\${Number(v.km).toLocaleString('pt-BR')} km\` : 'N/A',
        foto: v.images?.[0] || null,
      })) || [],
    };

    // Monta o prompt do sistema
    const systemPrompt = agentConfig?.system_prompt || \`Você é um assistente virtual de vendas.
Seu objetivo é atender clientes, apresentar veículos do estoque e qualificar leads.\`;

    const contextString = \`\\n\\n=== DADOS DO SISTEMA ===\\n\${JSON.stringify(contextData, null, 2)}\\n=== FIM DOS DADOS ===\`;

    const messages = [
      { role: 'system', content: systemPrompt + contextString },
      ...conversation_history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Chama a OpenAI API diretamente
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${OPENAI_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agentConfig?.llm_model || 'gpt-4o-mini',
        messages,
        temperature: agentConfig?.temperature || 0.7,
        max_tokens: agentConfig?.max_tokens || 2048,
      }),
    });

    if (!response.ok) throw new Error(\`AI error: \${response.status}\`);

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    // Extrai fotos da resposta [ENVIAR_FOTO: URL]
    const photoRegex = /\\[ENVIAR_FOTO:\\s*(https?:\\/\\/[^\\]]+)\\]/gi;
    const extractedImages: string[] = [];
    let match;
    while ((match = photoRegex.exec(content)) !== null) {
      extractedImages.push(match[1].trim());
    }
    const cleanContent = content.replace(photoRegex, '').trim();

    // Gera áudio se habilitado
    let audioContent = null;
    if (agentConfig?.enable_voice && agentConfig?.voice_id) {
      audioContent = await generateVoiceAudio(cleanContent, agentConfig.voice_id);
    }

    return new Response(
      JSON.stringify({
        response: cleanContent,
        images: extractedImages,
        audio_content: audioContent,
        tokens_used: aiResponse.usage?.total_tokens || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-agent-chat] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno',
        response: 'Desculpe, ocorreu um erro. Tente novamente.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`} />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Secrets Necessários</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code>OPENAI_API_KEY</code> - Chave da API OpenAI (obrigatório)</li>
              <li>• <code>ELEVENLABS_API_KEY</code> - Para geração de voz (opcional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 3. TYPES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            3. TypeScript Types
          </CardTitle>
          <CardDescription>
            Crie o arquivo src/types/ai-agents.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock language="typescript" code={`// =============================================
// TIPOS DO MÓDULO AI AGENT
// =============================================

export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google Gemini' },
] as const;

export const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
} as const;

export const AGENT_OBJECTIVES = [
  { value: 'qualify_leads', label: 'Qualificar Leads' },
  { value: 'schedule_test_drive', label: 'Agendar Test Drives' },
  { value: 'answer_faq', label: 'Responder FAQs' },
  { value: 'customer_support', label: 'Suporte ao Cliente' },
] as const;

export const AGENT_STATUS = [
  { value: 'active', label: 'Ativo', color: 'green' },
  { value: 'inactive', label: 'Inativo', color: 'gray' },
  { value: 'training', label: 'Em Treinamento', color: 'yellow' },
] as const;

export const DEPLOYMENT_CHANNELS = [
  { value: 'widget', label: 'Widget Web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'api', label: 'API' },
] as const;

export interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  objective: string;
  status: 'active' | 'inactive' | 'training';
  
  // LLM Config
  llm_provider: 'openai' | 'google';
  llm_model: string;
  api_key_encrypted: string | null;
  temperature: number;
  top_p: number;
  max_tokens: number;
  system_prompt: string | null;
  
  // Memory
  short_term_memory_type: string;
  context_window_size: number;
  long_term_memory_enabled: boolean;
  vector_db_provider: string;
  vector_db_config: Record<string, unknown>;
  
  // Voice
  enable_voice: boolean;
  voice_id: string | null;
  elevenlabs_api_key: string | null;
  
  // Deployment
  deployment_channels: string[];
  whatsapp_instance_id: string | null;
  whatsapp_auto_reply: boolean;
  transfer_to_human_enabled: boolean;
  transfer_keywords: string[];
  
  created_at: string;
  updated_at: string;
}

export interface AIAgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  tool_type: string;
  endpoint_url: string | null;
  parameters: Record<string, unknown> | null;
  auth_method: string;
  is_active: boolean;
  created_at: string;
}

export interface AIAgentMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking: string | null;
  tool_calls: Record<string, unknown> | null;
  tokens_used: number | null;
  created_at: string;
}

export const DEFAULT_AGENT: Partial<AIAgent> = {
  name: '',
  description: '',
  objective: 'qualify_leads',
  status: 'inactive',
  llm_provider: 'openai',
  llm_model: 'gpt-4o-mini',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 2048,
  system_prompt: \`Você é um assistente virtual especializado em vendas.
  
Seu objetivo é:
1. Receber o cliente de forma cordial
2. Identificar o interesse do cliente
3. Apresentar opções do estoque
4. Qualificar o lead coletando dados de contato
5. Agendar visita quando houver interesse\`,
  short_term_memory_type: 'local',
  context_window_size: 10,
  long_term_memory_enabled: false,
  enable_voice: false,
  deployment_channels: [],
  whatsapp_auto_reply: true,
  transfer_to_human_enabled: true,
  transfer_keywords: ['falar com humano', 'atendente', 'vendedor'],
};`} />
        </CardContent>
      </Card>

      {/* 4. HOOKS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            4. React Hooks
          </CardTitle>
          <CardDescription>
            Crie o arquivo src/hooks/useAIAgents.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock language="typescript" code={`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIAgent } from '@/types/ai-agents';

// Listar todos os agentes
export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AIAgent[];
    },
  });
}

// Buscar um agente específico
export function useAIAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AIAgent;
    },
    enabled: !!id,
  });
}

// Criar agente
export function useCreateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AIAgent>) => {
      const { data: agent, error } = await supabase
        .from('ai_agents')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(\`Erro: \${error.message}\`);
    },
  });
}

// Atualizar agente
export function useUpdateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AIAgent> }) => {
      const { data: agent, error } = await supabase
        .from('ai_agents')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return agent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent', variables.id] });
      toast.success('Agente atualizado!');
    },
  });
}

// Deletar agente
export function useDeleteAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente excluído!');
    },
  });
}`} />
        </CardContent>
      </Card>

      {/* 5. HOOK DE CHAT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            5. Hook de Chat com o Agente
          </CardTitle>
          <CardDescription>
            Crie o arquivo src/hooks/useAgentChat.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock language="typescript" code={`import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  audio?: string;
}

export function useAgentChat(agentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Adiciona mensagem do usuário
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          message: content,
          agent_id: agentId,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          data_sources: ['inventory', 'faq'],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        images: data.images,
        audio: data.audio_content,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Erro ao enviar mensagem');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
  };
}`} />
        </CardContent>
      </Card>

      {/* 6. ROTAS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            6. Estrutura de Rotas
          </CardTitle>
          <CardDescription>
            Adicione estas rotas no seu App.tsx
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock language="typescript" code={`// App.tsx - Adicione as rotas

import AIAgentsLayout from './components/ai-agents/AIAgentsLayout';
import AIAgentsListPage from './components/ai-agents/pages/AIAgentsListPage';
import AgentBasicsPage from './components/ai-agents/pages/AgentBasicsPage';
import AgentLLMConfigPage from './components/ai-agents/pages/AgentLLMConfigPage';
import AgentMemoryPage from './components/ai-agents/pages/AgentMemoryPage';
import AgentToolsPage from './components/ai-agents/pages/AgentToolsPage';
import AgentWorkflowsPage from './components/ai-agents/pages/AgentWorkflowsPage';
import AgentGuardrailsPage from './components/ai-agents/pages/AgentGuardrailsPage';
import AgentMonitoringPage from './components/ai-agents/pages/AgentMonitoringPage';
import AgentTestsPage from './components/ai-agents/pages/AgentTestsPage';
import AgentDeploymentPage from './components/ai-agents/pages/AgentDeploymentPage';

// Dentro do Routes:
<Route path="/ai-agents" element={<AIAgentsLayout />}>
  <Route index element={<AIAgentsListPage />} />
  <Route path="novo" element={<AgentBasicsPage />} />
  <Route path=":agentId/basico" element={<AgentBasicsPage />} />
  <Route path=":agentId/llm" element={<AgentLLMConfigPage />} />
  <Route path=":agentId/memoria" element={<AgentMemoryPage />} />
  <Route path=":agentId/ferramentas" element={<AgentToolsPage />} />
  <Route path=":agentId/workflows" element={<AgentWorkflowsPage />} />
  <Route path=":agentId/guardrails" element={<AgentGuardrailsPage />} />
  <Route path=":agentId/monitoramento" element={<AgentMonitoringPage />} />
  <Route path=":agentId/testes" element={<AgentTestsPage />} />
  <Route path=":agentId/implantacao" element={<AgentDeploymentPage />} />
</Route>`} />

          <div className="mt-4 bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Páginas do Módulo</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>AIAgentsListPage</strong> - Lista de agentes com cards</li>
              <li>• <strong>AgentBasicsPage</strong> - Nome, descrição, objetivo, avatar</li>
              <li>• <strong>AgentLLMConfigPage</strong> - Provedor, modelo, temperatura, prompt</li>
              <li>• <strong>AgentMemoryPage</strong> - Memória de curto/longo prazo, RAG</li>
              <li>• <strong>AgentToolsPage</strong> - Ferramentas/APIs que o agente pode usar</li>
              <li>• <strong>AgentWorkflowsPage</strong> - Automações e fluxos</li>
              <li>• <strong>AgentGuardrailsPage</strong> - Regras de segurança e limites</li>
              <li>• <strong>AgentMonitoringPage</strong> - Métricas e conversas</li>
              <li>• <strong>AgentTestsPage</strong> - Testes automatizados</li>
              <li>• <strong>AgentDeploymentPage</strong> - Widget, WhatsApp, API</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 7. PROMPT DO AGENTE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            7. Prompt do Agente (System Prompt)
          </CardTitle>
          <CardDescription>
            Exemplo de prompt para qualificação de leads automotivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock language="text" code={`=== IDENTIDADE ===
Você é o GUTO, assistente virtual da loja Matheus Veículos.
Use linguagem MASCULINA: "obrigado", "animado", "feliz".

=== PERSONALIDADE ===
- Tom: amigável, descontraído, empático
- Escreva mensagens curtas (máx 3-4 linhas)
- Use emojis com moderação (1-2 por mensagem)
- Seja natural, como um vendedor experiente conversando

=== OBJETIVO ===
Qualificar leads coletando:
1. Nome do cliente
2. Veículo de interesse (marca, modelo, ano)
3. Orçamento disponível
4. Forma de pagamento (à vista, financiamento, troca)
5. Entrada disponível (se financiamento)

=== REGRAS ===
1. NUNCA invente veículos - use APENAS o estoque fornecido
2. Se não tiver o veículo pedido, sugira alternativas similares
3. Quando o cliente perguntar preço, sempre diga o valor exato
4. Se pedirem foto, use: [ENVIAR_FOTO: URL]
5. Se pedirem para falar com humano, transfira imediatamente
6. Nunca negocie preço - apenas informe os valores

=== FLUXO DE CONVERSA ===
1. Cumprimente e pergunte como pode ajudar
2. Identifique o veículo de interesse
3. Apresente opções do estoque com preços
4. Pergunte sobre forma de pagamento
5. Colete nome e confirme interesse
6. Ofereça agendamento de visita/test-drive

=== PALAVRAS DE TRANSFERÊNCIA ===
Se o cliente disser: "falar com humano", "vendedor", "pessoa real", "atendente"
→ Transfira imediatamente para um vendedor.`} />
        </CardContent>
      </Card>

      {/* 8. INTEGRAÇÃO WHATSAPP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            8. Integração com WhatsApp (Opcional)
          </CardTitle>
          <CardDescription>
            Para conectar o agente ao WhatsApp via Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Pré-requisitos</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Evolution API instalada e configurada</li>
              <li>• Secrets: EVOLUTION_API_URL, EVOLUTION_API_KEY</li>
              <li>• Instância WhatsApp conectada via QR Code</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Webhook do WhatsApp</Badge>
            <p className="text-sm text-muted-foreground">
              O webhook do WhatsApp recebe mensagens e chama o ai-agent-chat automaticamente.
              Configure o webhook da Evolution API para apontar para sua edge function whatsapp-webhook.
            </p>
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Fluxo de Mensagens</Badge>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Cliente envia mensagem no WhatsApp</li>
              <li>Evolution API dispara webhook</li>
              <li>whatsapp-webhook recebe e processa</li>
              <li>Chama ai-agent-chat com a mensagem</li>
              <li>Recebe resposta do agente</li>
              <li>Envia resposta via whatsapp-send</li>
              <li>Se houver imagens, envia separadamente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Final */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Implementação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Executar migrations SQL no Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Criar edge function ai-agent-chat</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Configurar secrets (LOVABLE_API_KEY)</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Criar tipos TypeScript</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Criar hooks React</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Configurar rotas no App.tsx</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Criar páginas do módulo</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Configurar prompt do agente</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">(Opcional) Integrar com WhatsApp</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
