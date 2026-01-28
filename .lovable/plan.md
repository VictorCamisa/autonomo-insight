
# Plano Detalhado: Correção do Sistema de Embeddings e RAG da IA Gabi

## Resumo Executivo

A análise identificou **6 problemas críticos** que estão causando falhas na busca de veículos, envio incorreto de fotos e alucinações da IA. Este plano corrige cada problema em ordem de prioridade.

---

## Diagnóstico Confirmado

| # | Problema | Status Atual | Impacto |
|---|----------|--------------|---------|
| 1 | **Embeddings NULL** | 0% dos veículos têm embedding | Busca semântica 100% quebrada |
| 2 | **Fallback dilui contexto** | 15 carros aleatórios no prompt | IA confunde veículos |
| 3 | **Fotos categorizadas como "geral"** | 45 de 81 fotos são "geral" | IA não encontra fotos específicas |
| 4 | **Contexto sobrecarregado** | Até 15 veículos no prompt | Mistura de informações |
| 5 | **Veículo ativo não priorizado** | Histórico não focado | IA perde o fio da conversa |
| 6 | **Sem validação de fotos** | Nenhuma verificação pós-IA | Fotos erradas podem ser enviadas |

---

## Fase 1: Corrigir Embeddings (Prioridade Máxima)

### Tarefa 1.1: Implementar Geração Real de Embeddings

**Arquivo:** `supabase/functions/sync-vehicle-embeddings/index.ts`

**Problema Atual:**
```typescript
// Linha 74 - embedding sempre NULL
embedding: null, // No embedding since API doesn't support it
```

**Solução:**
- Chamar a API OpenAI `text-embedding-3-small` para cada veículo
- Gerar embedding com 1536 dimensões
- Salvar no campo `embedding` da tabela `vehicle_embeddings`

**Implementação:**
```text
1. Adicionar função generateEmbedding():
   - POST para https://api.openai.com/v1/embeddings
   - Model: text-embedding-3-small
   - Retornar array de 1536 floats

2. Modificar loop de processamento:
   - Para cada veículo, gerar embedding do search_text
   - Upsert com embedding real (não null)
   - Adicionar tratamento de erros com retry

3. Adicionar rate limiting:
   - 100ms delay entre chamadas
   - Batch de 50 veículos por vez
```

### Tarefa 1.2: Sincronizar Embeddings Existentes

**Ação:** Após deploy, executar sync_all para popular todos os embeddings

---

## Fase 2: Otimizar Fallback e Reduzir Contexto

### Tarefa 2.1: Reduzir Limite de Veículos no Prompt

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Problema Atual:**
- Linha 843: `limit(15)` para amostra de estoque
- Linha 796: `limit(10)` para busca por modelo
- Resultado: Até 25+ veículos podem ir para o prompt

**Solução:**
- Limitar TOTAL de veículos no prompt a **5 no máximo**
- Se encontrar veículo específico: apenas ele + 2 alternativas
- Se busca genérica: top 5 mais relevantes

**Implementação:**
```text
1. Alterar linha 843: limit(15) -> limit(5)
2. Alterar linha 796: limit(10) -> limit(3)
3. Adicionar corte final antes do prompt:
   relevantVehicles = relevantVehicles.slice(0, 5);
4. Priorizar veículos com maior similarity score
```

### Tarefa 2.2: Melhorar Qualidade do Fallback

**Problema:** Quando RAG falha, retorna carros aleatórios

**Solução:**
- Fallback inteligente baseado em keywords da mensagem
- Se nenhum keyword match: informar ao usuário ao invés de enviar carros aleatórios

---

## Fase 3: Corrigir Categorização de Fotos

### Tarefa 3.1: Script de Recategorização

**Problema:** 45 de 81 fotos estão como `geral` ao invés de categorias específicas

**Ação:** Executar SQL para identificar e atualizar:

```sql
-- Identificar fotos genéricas
SELECT vi.id, vi.image_url, vi.category, v.brand, v.model 
FROM vehicle_images vi
JOIN vehicles v ON v.id = vi.vehicle_id
WHERE vi.category = 'geral' OR vi.category IS NULL;
```

**Categorias a implementar:**
- `interior_painel` - Fotos do painel
- `interior_bancos` - Fotos dos bancos
- `exterior_frontal` - Frente do carro
- `exterior_traseira` - Traseira
- `exterior_lateral_esq/dir` - Laterais
- `motor` - Motor

### Tarefa 3.2: Sincronização Automática de Fotos Legadas

**Problema:** Alguns veículos têm fotos no campo `images[]` mas não na tabela `vehicle_images`

**Solução:** Adicionar trigger ou função que sincroniza automaticamente

---

## Fase 4: Identificação de Veículo Ativo

### Tarefa 4.1: Priorizar Veículo da Conversa

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Problema:** Quando cliente pergunta "foto do painel", a IA não sabe de qual carro

**Solução:**
1. Analisar as últimas 5 mensagens do histórico
2. Identificar o veículo mais recentemente mencionado
3. Marcar esse veículo como "ATIVO" no prompt

**Implementação:**
```text
1. Criar função identifyActiveVehicle(history, vehicleList):
   - Percorrer mensagens do mais recente para o mais antigo
   - Encontrar primeira menção de marca+modelo
   - Retornar esse veículo como "ativo"

2. No prompt, destacar veículo ativo:
   "⭐ VEÍCULO ATIVO (cliente está falando sobre este):"
   Mostrar apenas este veículo com TODAS as fotos

3. Outros veículos ficam em seção secundária:
   "📋 Outros veículos mencionados:"
```

### Tarefa 4.2: Melhorar Instrução de Contexto

Adicionar ao system prompt:
```
REGRA DE CONTEXTO:
- Quando o cliente perguntar "foto do interior/painel/bancos" SEM especificar o carro
- Assuma que ele está falando do veículo marcado com ⭐ VEÍCULO ATIVO
- Se não houver veículo ativo, PERGUNTE: "Você quer a foto de qual veículo?"
```

---

## Fase 5: Validação Pós-IA de Fotos

### Tarefa 5.1: Implementar Validação de URL

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Problema:** Nenhuma verificação se a URL da foto pertence ao veículo correto

**Solução:** Após extrair URLs do response da IA, validar cada uma:

```text
1. Criar função validatePhotoUrl(url, activeVehicleId):
   - Buscar na tabela vehicle_images onde image_url = url
   - Verificar se vehicle_id corresponde ao veículo ativo
   - Retornar true/false

2. No loop de extractedPhotos:
   - Para cada URL, chamar validatePhotoUrl
   - Se inválida: não enviar + logar warning
   - Opcionalmente: enviar mensagem corrigida
```

### Tarefa 5.2: Log de Auditoria

Adicionar logs para debug futuro:
- URL extraída
- Veículo esperado
- Veículo real da URL
- Resultado da validação

---

## Fase 6: Testes End-to-End

### Tarefa 6.1: Cenários de Teste

| Teste | Entrada | Resultado Esperado |
|-------|---------|-------------------|
| Busca específica | "Tem Tracker 2015?" | Retorna apenas Tracker 2015 |
| Foto específica | "Foto do painel do Tracker" | URL da foto interior_painel do Tracker |
| Foto sem contexto | "Tem foto dos bancos?" | Pergunta "De qual veículo?" |
| Veículo inexistente | "Tem BMW X5 2025?" | "Não temos esse modelo no estoque" |
| Faixa de preço | "Carros até 50 mil" | Top 5 ordenados por preço |

### Tarefa 6.2: Monitoramento

- Adicionar métricas de taxa de sucesso do RAG
- Logar quando fallback é acionado
- Alertar quando embeddings NULL são encontrados

---

## Cronograma de Implementação

```text
ETAPA 1 (Crítica):
├── Corrigir sync-vehicle-embeddings (gerar embeddings reais)
├── Executar sync_all para popular banco
└── Verificar que busca semântica funciona

ETAPA 2 (Alta Prioridade):
├── Reduzir limite de veículos no prompt (max 5)
├── Implementar identificação de veículo ativo
└── Melhorar instruções de contexto

ETAPA 3 (Média Prioridade):
├── Recategorizar fotos "geral"
├── Adicionar validação de URL de fotos
└── Implementar logs de auditoria

ETAPA 4 (Manutenção):
├── Testes end-to-end
├── Monitoramento de métricas
└── Documentação
```

---

## Seção Técnica Detalhada

### Mudanças no sync-vehicle-embeddings

```typescript
// ANTES (linha 74):
embedding: null,

// DEPOIS:
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) return null;
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });
  
  if (!response.ok) return null;
  const data = await response.json();
  return data.data?.[0]?.embedding || null;
}

// No loop de processamento:
const embedding = await generateEmbedding(searchText);
// ...
embedding: embedding, // Agora é um array real, não null
```

### Mudanças no whatsapp-webhook para veículo ativo

```typescript
// Nova função
function identifyActiveVehicle(
  history: Array<{role: string; content: string}>,
  availableVehicles: any[]
): any | null {
  // Percorrer do mais recente para o mais antigo
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const content = msg.content.toLowerCase();
    
    // Procurar menção de veículo
    for (const vehicle of availableVehicles) {
      const model = vehicle.model?.toLowerCase() || '';
      if (content.includes(model) && model.length > 2) {
        return vehicle;
      }
    }
  }
  return null;
}

// Uso no prompt
const activeVehicle = identifyActiveVehicle(history, relevantVehicles);
if (activeVehicle) {
  systemPrompt += '\n\n⭐ VEÍCULO ATIVO (cliente está falando sobre este):\n';
  // Incluir TODAS as fotos deste veículo
}
```

### Validação de URL de Foto

```typescript
async function validatePhotoUrl(
  supabase: any,
  url: string,
  expectedVehicleId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('vehicle_images')
    .select('vehicle_id')
    .eq('image_url', url)
    .single();
  
  if (!data) return false;
  return data.vehicle_id === expectedVehicleId;
}

// Uso antes de enviar
for (const photoUrl of extractedPhotos) {
  const isValid = await validatePhotoUrl(supabase, photoUrl, activeVehicle?.id);
  if (!isValid) {
    console.warn('[Photo Validation] BLOCKED - URL does not belong to active vehicle');
    continue; // Não envia foto errada
  }
  await sendWhatsAppImage(instanceName, targetJid, photoUrl);
}
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `supabase/functions/sync-vehicle-embeddings/index.ts` | Reescrever para gerar embeddings reais |
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar identificação de veículo ativo + validação |
| `supabase/functions/search-vehicles-rag/index.ts` | Melhorar fallback (opcional) |
| Database | Script SQL para recategorizar fotos |
