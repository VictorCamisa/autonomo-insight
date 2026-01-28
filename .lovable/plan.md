

# Plano: Corrigir Alucinações da IA no WhatsApp

## Problema Identificado

A IA (Gabi) está "delirando" - fazendo afirmações falsas sobre veículos e status de estoque. Por exemplo, na conversa com Bia:
- **Erro 1**: "O Doblo não está disponível" → **FALSO!** O Doblo 1.4 2011 está disponível (R$ 43.990)
- **Erro 2**: "Sim, a Doblo já foi vendida" → **FALSO!** A IA inventou isso

### Causas Raiz

| Problema | Impacto |
|----------|---------|
| **Temperature muito alta (0.6)** | A IA está sendo muito "criativa" e inventando informações |
| **Busca RAG não retornando resultados** | O sistema de busca semântica não encontra os veículos no contexto |
| **Conflito na extração de dados** | Frases como "já vendeu" são interpretadas como dados de troca |
| **Veículos filtrados errado** | Apenas `status = 'disponivel'` é enviado, mas a IA precisa saber o que não tem também |

---

## Solução Proposta

### 1. Reduzir Temperature para Máximo 0.35
A temperatura de 0.6 é muito alta para um assistente de vendas que precisa ser preciso.

```text
Antes: temperature: 0.6 (no banco de dados)
Depois: temperatura máxima forçada em código: 0.35
```

### 2. Melhorar a Busca de Veículos
O sistema RAG está falhando em encontrar a Doblo. Adicionar busca direta por texto:

```text
1. Primeiro: tentar busca semântica (RAG)
2. Se não encontrar: busca direta por nome/modelo
3. Aumentar limite de resultados e clareza do contexto
```

### 3. Reforçar Prompt Anti-Alucinação
Adicionar regras ainda mais específicas:

```text
❌ NUNCA afirme que um carro foi vendido se não está na lista
❌ NUNCA diga "não temos" sem verificar a lista abaixo
✅ SEMPRE verifique o estoque ANTES de responder sobre disponibilidade
```

### 4. Corrigir Extração de Dados
Melhorar o prompt de extração para não confundir frases do cliente sobre estoque com dados de qualificação:

```text
⚠️ "Já vendeu a Doblo?" = pergunta sobre estoque, NÃO é dado de troca
⚠️ "Já vendi meu carro" = pode indicar troca
```

### 5. Atualizar Agent no Banco de Dados
Reduzir temperature do agente Gabi de 0.6 para 0.35.

---

## Arquivos a Modificar

### `supabase/functions/whatsapp-webhook/index.ts`

1. **Forçar temperatura máxima 0.35** (linha ~1195)
2. **Adicionar busca direta por texto** como fallback ao RAG (após linha 656)
3. **Melhorar prompt anti-alucinação** (linhas 711-737)
4. **Clarificar regras de extração de dados** para não confundir com perguntas sobre estoque (linhas 2139-2167)

---

## Seção Técnica - Detalhes das Mudanças

### Mudança 1: Temperature Máxima
```typescript
// Linha ~1195 - Forçar máximo de 0.35 (antes era 0.4)
temperature: Math.min(agent.temperature || 0.35, 0.35),
```

### Mudança 2: Busca Direta de Veículos
```typescript
// Após linha 656 - Se RAG falhar, buscar por texto direto
if (relevantVehicles.length === 0 && messageHasVehicleIntent) {
  // Extrair palavras-chave da mensagem
  const searchTerms = actualMessage.toLowerCase().match(/polo|gol|onix|civic|doblo|toro|hilux|corolla|hb20|compass|tracker|kicks|uno|palio|argo|strada|mobi|bravo/gi);
  
  if (searchTerms && searchTerms.length > 0) {
    const { data: vehiclesByName } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('model', `%${searchTerms[0]}%`)
      .limit(5);
    
    if (vehiclesByName?.length) {
      relevantVehicles = vehiclesByName;
    }
  }
}
```

### Mudança 3: Prompt Anti-Alucinação Reforçado
```typescript
const antiHallucinationRules = `
===== ⚠️ REGRAS CRÍTICAS DE ESTOQUE =====

🔴 ANTES DE RESPONDER SOBRE QUALQUER VEÍCULO:
1. LEIA a lista "VEÍCULOS DISPONÍVEIS" abaixo
2. PROCURE o modelo que o cliente perguntou
3. SE ENCONTRAR → Cite os detalhes EXATOS da lista
4. SE NÃO ENCONTRAR → Diga "esse modelo não está no estoque no momento"

❌ PROIBIDO INVENTAR:
- Não diga "foi vendido" se o carro não está na lista
- Não confirme disponibilidade sem verificar a lista
- Não invente cores, anos, preços ou km

✅ RESPOSTAS CORRETAS:
- Cliente: "Tem Doblo?" + Doblo na lista → "Sim! Temos a Doblo 1.4 2011 por R$ 43.990!"
- Cliente: "Tem Civic?" + Civic NÃO na lista → "O Civic não está no estoque agora. Temos outros modelos..."

⚠️ SE NÃO SABE → "Deixa eu verificar e já te retorno!"
===== FIM DAS REGRAS =====
`;
```

### Mudança 4: Extração de Dados Mais Rigorosa
```typescript
// No prompt de extractDataWithAI
`⚠️ CUIDADO COM FALSOS POSITIVOS:
- "Já vendeu a Doblo?" = pergunta sobre ESTOQUE, não é dado de troca
- "Vocês já venderam?" = pergunta sobre estoque
- "Já vendi MEU carro" = pode indicar que TEM troca
- "Tenho um Gol para trocar" = tem troca confirmado

has_trade_in = true APENAS SE:
- Cliente disse "tenho um carro para trocar"
- Cliente disse "dou meu carro na troca"
- Cliente disse "quero entregar meu [modelo]"

has_trade_in = false APENAS SE:
- Cliente disse "não tenho carro para trocar"
- Cliente disse "vou comprar à vista, sem troca"`
```

---

## Resultado Esperado

Após as correções:
- ✅ IA verificará a lista de veículos antes de afirmar disponibilidade
- ✅ Temperature baixa evitará "criatividade" excessiva
- ✅ Busca direta por nome garantirá que Doblo seja encontrada
- ✅ Extração de dados não confundirá perguntas sobre estoque com dados de qualificação

