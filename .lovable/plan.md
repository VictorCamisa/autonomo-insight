
# Plano de Refatoração Completa do Módulo CRM

## Visão Geral

Você está propondo uma transformação radical do CRM atual para um sistema verdadeiramente inteligente e automatizado. Após analisar todo o código existente, identifiquei exatamente o que precisa mudar.

---

## Diagnóstico do Estado Atual

### Problemas Identificados:
1. **Dois pipelines confusos** - O módulo "Leads" tem um pipeline próprio (`LeadsPipeline`) que duplica a lógica do "Pipeline" principal (negociações)
2. **Estágios do Pipeline não refletem o fluxo real** - Os estágios atuais são: `em_andamento → proposta_enviada → negociando → ganho → perdido`
3. **Follow-up limitado** - Só funciona com trigger `no_response_to_bot`, sem integração real com estágios do pipeline
4. **IA desconectada do fluxo** - A Gabi qualifica mas não move cards automaticamente nem gerencia o ciclo de vida da negociação
5. **Falta de embeddings e RAG avançado** - Hoje o `ai-agent-chat` só faz query simples no banco

---

## Nova Arquitetura Proposta

### 1. MÓDULO LEADS (Contatos Unificados)

**Transformação:** De pipeline → Lista unificada de contatos

```text
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO LEADS                              │
├─────────────────────────────────────────────────────────────┤
│  Visão: Lista/Tabela de TODOS os contatos externos          │
│                                                              │
│  Status:                                                     │
│    • ATIVO (🟢) = Tem negociação ativa no Pipeline           │
│    • INATIVO (⚫) = Sem negociação ativa                     │
│                                                              │
│  Funcionalidades:                                            │
│    - Busca avançada (nome, telefone, veículo interesse)      │
│    - Filtros por origem, data, vendedor                      │
│    - Histórico completo de interações                        │
│    - Botão "Iniciar Negociação" → Cria card no Pipeline      │
└─────────────────────────────────────────────────────────────┘
```

**Mudanças Técnicas:**
- Remover `LeadsPipeline` component
- Criar novo componente `ContactsListView` (tabela com DataTable)
- Campo calculado `is_active` baseado em JOIN com `negotiations WHERE status NOT IN ('ganho', 'perdido')`
- Manter histórico de interações e qualificação

---

### 2. MÓDULO PIPELINE (Novos Estágios)

**Transformação:** Estágios alinhados com o ciclo de vida real

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE DE NEGOCIAÇÕES                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ EM ATEND. IA │  NEGOCIANDO  │    GANHO     │  FOLLOW-UP   │   PERDIDO    │             │
│              │              │              │              │              │             │
│ Mensagens    │ Lead com     │ Venda        │ Sem resposta │ Motivo       │             │
│ chegando     │ vendedor     │ concretizada │ há 24h+      │ registrado   │             │
│              │ qualificado  │              │              │              │             │
│ IA validando │              │              │              │              │             │
│ lead no DB   │              │              │              │              │             │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

**Novos Status no Banco:**
```sql
ALTER TYPE negotiation_status ADD VALUE 'atendimento_ia';
ALTER TYPE negotiation_status ADD VALUE 'follow_up';
-- Remover: 'em_andamento', 'proposta_enviada', 'pausado'
```

**Lógica de Transições Automáticas:**

| De | Para | Gatilho |
|---|---|---|
| - | `atendimento_ia` | Mensagem recebida (webhook) |
| `atendimento_ia` | `negociando` | Lead qualificado (Q2+) |
| `negociando` | `ganho` | Venda registrada |
| `negociando` | `follow_up` | 24h sem resposta |
| `follow_up` | `atendimento_ia` | Lead respondeu |
| Qualquer | `perdido` | Manual ou automático |

---

### 3. MÓDULO FOLLOW-UP (Hub de Reativação)

**Transformação:** De fluxos simples → Motor de reativação inteligente

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        MÓDULO FOLLOW-UP                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📊 DASHBOARD DE REATIVAÇÃO                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Aguardando   │ │ Em Follow-up │ │ Reativados   │ │ Expirados    │    │
│  │ (24h-48h)    │ │ (ativo)      │ │ (sucesso)    │ │ (sem resposta│    │
│  │     42       │ │     18       │ │     12       │ │     8        │    │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                          │
│  🔄 FLUXOS DE REATIVAÇÃO                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Fluxo: Reativação Semanal Completa                              │    │
│  │ Status: 🟢 Ativo                                                 │    │
│  │                                                                  │    │
│  │  Dia 1 (24h) → Dia 2 (48h) → Dia 3 (72h) → Dia 5 → Dia 7       │    │
│  │     ⬇️           ⬇️           ⬇️           ⬇️       ⬇️          │    │
│  │  "Oi {nome},  "Ainda tá    "Vi que você   "Última   "Fechando   │    │
│  │   vi que..."  pensando?"   olhou o..."    chance!"  contato"    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ⚡ REGRA DE RESET: Se lead responder → volta para "Em Atend. IA"       │
│                     e reseta contador de follow-up                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Novas Tabelas:**
```sql
-- Tracking de follow-up por lead
CREATE TABLE lead_follow_up_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  negotiation_id UUID REFERENCES negotiations(id),
  flow_id UUID REFERENCES follow_up_flows(id),
  current_step INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active, completed, reactivated, expired
  reactivated_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Integração com Pipeline:**
- Cron job monitora `negotiations WHERE status = 'negociando' AND last_message > 24h`
- Move automaticamente para `follow_up`
- Se lead responder → mover para `atendimento_ia` + reset tracking

---

### 4. ORQUESTRADOR IA (Agente Inteligente)

**Transformação:** De chat simples → Cérebro do CRM

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     ORQUESTRADOR IA (GABI)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🧠 COMPONENTES:                                                         │
│                                                                          │
│  1. EMBEDDINGS DE TUDO                                                   │
│     ├── Conversas WhatsApp → Vector embeddings                          │
│     ├── Histórico de negociações → Padrões de sucesso                   │
│     ├── Veículos vendidos → Perfil de comprador                         │
│     └── FAQs e scripts → Base de conhecimento                           │
│                                                                          │
│  2. RAG AVANÇADO (Retrieval-Augmented Generation)                       │
│     ├── Busca semântica em conversas anteriores                         │
│     ├── Contexto de toda a jornada do lead                              │
│     └── Sugestões baseadas em casos similares                           │
│                                                                          │
│  3. AÇÕES AUTOMÁTICAS                                                    │
│     ├── Mover cards entre estágios                                       │
│     ├── Disparar follow-ups inteligentes                                 │
│     ├── Criar alertas para vendedores                                    │
│     └── Gerar relatórios de performance                                  │
│                                                                          │
│  4. PERSONALIZAÇÃO VIA UI                                                │
│     └── Página AI AGENT para configurar:                                 │
│         - Prompts por estágio                                            │
│         - Regras de transição                                            │
│         - Templates de follow-up                                         │
│         - Gatilhos de ação                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Nova Infraestrutura de Embeddings:**
```sql
-- Embeddings de conversas
CREATE TABLE conversation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  conversation_id UUID REFERENCES ai_agent_conversations(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca vetorial
CREATE INDEX idx_conv_embeddings ON conversation_embeddings 
  USING ivfflat (embedding vector_cosine_ops);
```

**Nova Edge Function: `ai-orchestrator`**
```typescript
// Responsabilidades:
// 1. Gerar embeddings de novas mensagens
// 2. Buscar contexto relevante via RAG
// 3. Decidir ações automáticas
// 4. Executar transições de estágio
// 5. Disparar follow-ups inteligentes
```

---

## Plano de Implementação (Fases)

### FASE 1: Reestruturação Base (Prioridade Alta)
1. Migrar tipos do banco de dados (novos status de negociação)
2. Refatorar `NegotiationPipeline` com novos estágios
3. Criar `ContactsListView` para substituir `LeadsPipeline`
4. Atualizar `whatsapp-webhook` para criar/mover cards automaticamente

### FASE 2: Follow-up Inteligente
5. Criar tabela `lead_follow_up_tracking`
6. Atualizar `process-follow-ups` para integrar com Pipeline
7. Implementar lógica de reset quando lead responder
8. Criar UI de fluxos de reativação semanal

### FASE 3: IA Orquestradora
9. Criar tabela `conversation_embeddings`
10. Criar edge function `sync-conversation-embeddings`
11. Criar edge function `ai-orchestrator`
12. Atualizar `ai-agent-chat` para usar RAG avançado

### FASE 4: UI de Configuração
13. Expandir página AI Agent com configurações por estágio
14. Criar editor visual de fluxos de automação
15. Dashboard de métricas de reativação

---

## Detalhes Técnicos

### Arquivos a Criar:
- `src/pages/Contacts.tsx` - Nova página de contatos
- `src/components/crm/ContactsListView.tsx` - Tabela unificada
- `src/components/crm/ReactivationDashboard.tsx` - Dashboard follow-up
- `src/components/crm/FlowBuilder.tsx` - Editor visual de fluxos
- `supabase/functions/ai-orchestrator/index.ts` - Cérebro IA
- `supabase/functions/sync-conversation-embeddings/index.ts` - Embeddings

### Arquivos a Modificar:
- `src/types/negotiations.ts` - Novos status
- `src/components/crm/NegotiationPipeline.tsx` - Novos estágios
- `src/pages/Leads.tsx` → `src/pages/Contacts.tsx` - Refatorar completo
- `src/pages/FollowUp.tsx` - Adicionar dashboard reativação
- `src/components/crm/CRMLayout.tsx` - Atualizar navegação
- `supabase/functions/whatsapp-webhook/index.ts` - Auto-criar negociações
- `supabase/functions/process-follow-ups/index.ts` - Integrar com pipeline

### Migrações de Banco:
```sql
-- 1. Novos status de negociação
ALTER TYPE negotiation_status ADD VALUE 'atendimento_ia';
ALTER TYPE negotiation_status ADD VALUE 'follow_up';

-- 2. Tabela de tracking
CREATE TABLE lead_follow_up_tracking (...);

-- 3. Tabela de embeddings
CREATE TABLE conversation_embeddings (...);

-- 4. Função para reset de follow-up
CREATE FUNCTION reset_follow_up_on_response() ...
```

---

## Estimativa de Esforço

| Fase | Componentes | Complexidade |
|------|-------------|--------------|
| 1 | Pipeline + Leads | Alta |
| 2 | Follow-up | Média-Alta |
| 3 | IA Orquestradora | Muito Alta |
| 4 | UI Config | Média |

**Recomendação:** Implementar em fases, começando pela Fase 1 que resolve o problema imediato dos dois pipelines confusos e estágios incorretos.

---

## Próximos Passos

Ao aprovar este plano, começarei pela **Fase 1**:
1. Criar migração para novos status de negociação
2. Refatorar o componente `NegotiationPipeline` com os 5 novos estágios
3. Transformar a página Leads em uma lista unificada de contatos
4. Atualizar o webhook do WhatsApp para criar negociações automaticamente no estágio "Em Atendimento IA"

Quer que eu prossiga com a implementação?
