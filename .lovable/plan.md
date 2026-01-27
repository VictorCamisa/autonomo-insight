
# Plano: Silenciar IA no Estágio "Negociando" + Notificação Personalizada

## Resumo

Quando um lead é qualificado (Q2) e passa para o estágio "negociando":
1. **IA para de responder** - apenas o vendedor fala
2. **Vendedor recebe mensagem completa** - com ficha do lead, link para WhatsApp e sugestões de veículos

---

## O Que Será Feito

### 1. Silenciar IA no Estágio "Negociando"

Adicionar verificação no webhook **antes** de gerar resposta da IA:

```text
Fluxo Atual (com problema):
  Mensagem → Takeover? → Se não → IA RESPONDE SEMPRE

Novo Fluxo (corrigido):
  Mensagem → Takeover? → Estágio? → negociando/ganho → SILENCIA IA
                                  → atendimento_ia/follow_up → IA responde
```

**Lógica a adicionar:**
- Buscar a negociação ativa do lead
- Se status = `negociando` ou `ganho`: registrar mensagem mas NÃO responder
- Se status = `atendimento_ia` ou `follow_up`: IA responde normalmente

### 2. Mensagem Já Existe (Confirmado!)

A mensagem para o vendedor **já está implementada** e é enviada automaticamente quando o lead atinge Q2. Ela inclui:
- Nome do lead
- Link direto para WhatsApp (`wa.me/...`)
- Perfil financeiro (orçamento, entrada, parcela, crédito)
- Veículo de interesse
- CPF
- Sugestões de veículos do estoque

### 3. Persistir Configurações por Estágio (Opcional)

A página de configuração por estágio atualmente usa valores hardcoded. Podemos criar uma tabela para salvar essas configurações, permitindo que você ajuste comportamentos diretamente pela interface.

---

## Detalhes Técnicos

### Modificação no Webhook

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Localização:** Função `processWithAIAgent`, após verificação de "human takeover" (linha ~510)

**Código a adicionar:**
```typescript
// Check negotiation stage - AI only responds in atendimento_ia and follow_up
if (leadId) {
  const { data: negotiation } = await supabase
    .from('negotiations')
    .select('status, salesperson_id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Stages where AI should be silent (salesperson handles)
  const silentStages = ['negociando', 'ganho'];
  
  if (negotiation && silentStages.includes(negotiation.status)) {
    console.log('[AI Agent] Stage is', negotiation.status, '- AI silenced, salesperson handles');
    
    // Still save the message for history
    await supabase.from('ai_agent_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: actualMessage,
    });
    
    // Notify salesperson about new message (optional)
    if (negotiation.salesperson_id) {
      await supabase.from('notifications').insert({
        user_id: negotiation.salesperson_id,
        type: 'new_message',
        title: '💬 Nova mensagem do lead',
        message: `Mensagem: "${actualMessage.substring(0, 100)}..."`,
        link: '/whatsapp',
      });
    }
    
    return; // Do NOT generate AI response
  }
}
```

---

## Comportamento por Estágio (Resultado Final)

| Estágio | IA Responde? | Quem Atende |
|---------|--------------|-------------|
| `atendimento_ia` | ✅ Sim | Gabi (qualificação) |
| `negociando` | ❌ Não | Vendedor atribuído |
| `ganho` | ❌ Não | Manual |
| `follow_up` | ✅ Sim | Gabi (reengajamento) |
| `perdido` | ⚙️ Configurável | Gabi (recuperação) |

---

## Fluxo Completo de Atendimento

```text
1. LEAD NOVO CHEGA (WhatsApp)
   └─► Gabi responde, começa qualificação
   └─► Status: atendimento_ia

2. GABI QUALIFICA (Nome, Veículo, Orçamento)
   └─► Lead atinge Q2
   └─► Status muda para: negociando
   └─► Vendedor recebe "Ficha do Lead" via WhatsApp
   └─► Gabi envia mensagem de despedida ao cliente

3. CLIENTE CONTINUA CONVERSANDO
   └─► IA silencia, NÃO responde mais
   └─► Vendedor recebe notificação de nova mensagem
   └─► Vendedor assume a conversa

4. SE FICAR 24H SEM RESPOSTA
   └─► Status muda para: follow_up
   └─► Gabi volta a responder (reativação)
```

---

## Arquivos a Modificar

1. **`supabase/functions/whatsapp-webhook/index.ts`**
   - Adicionar verificação de estágio (~15 linhas de código)
   - Localização: após linha 510 (check de takeover)

---

## Tempo Estimado

- Modificação no webhook: 10 minutos
- Deploy e teste: 5 minutos

**Total: ~15 minutos**

---

## Resultado Esperado

Após a implementação:
1. Lead chega → Gabi qualifica no WhatsApp
2. Lead qualificado → Vai para "negociando" + vendedor recebe ficha
3. Lead manda mais mensagens → IA fica quieta, vendedor recebe notificação
4. Vendedor assume a negociação diretamente

A transição será automática e transparente para o cliente - ele nem perceberá que mudou de Gabi para o vendedor humano.
