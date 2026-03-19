

# Diagnóstico Completo: Por que o sistema está instável

## Problemas Encontrados

### 1. ERRO DE BUILD (bloqueante)
Os arquivos `Contato.tsx` e `PublicVehicleDetails.tsx` usam `source: 'site'` ao inserir leads, mas `'site'` **não existe** no enum `lead_source` do banco. Os valores válidos são: `website`, `indicacao`, `facebook`, `instagram`, `google_ads`, `olx`, `webmotors`, `outros`, `whatsapp`. Precisa trocar `'site'` por `'website'`.

### 2. Follow-up enviando mensagens para leads em `atendimento_ia` (PROBLEMA PRINCIPAL)
O fluxo "Follow up - Primeiro atendimento" está configurado com `target_negotiation_status: ['atendimento_ia']`. Isso significa que leads que acabaram de chegar e estão sendo atendidos pela IA **já recebem mensagens de follow-up** após 15 minutos de inatividade, como "Oieee, tá por ai?".

**Conflito com a IA**: Quando o follow-up envia "Oieee, tá por ai?", essa mensagem é enviada pelo Evolution API diretamente, **fora** do contexto da Gabi. Quando o lead responde a essa mensagem, a resposta entra no webhook, a Gabi processa e responde com base no contexto dela (que não inclui o "Oieee"). Isso gera uma experiência desconectada.

**O que deveria acontecer**: O follow-up do "primeiro atendimento" deveria ser tratado **dentro** da própria IA (Gabi), não como um fluxo externo paralelo. Ou o fluxo deveria mirar `follow_up` (após 24h de inatividade), não `atendimento_ia`.

### 3. 743 negociações paradas em `follow_up`
A função `move_stale_negotiations_to_follow_up()` move automaticamente negociações para `follow_up` após 24h sem mensagem. Porém, os fluxos de follow-up para o estágio `follow_up` estão **todos desativados**:
- "Follow-Up - Primeira semana" → **desativado**
- "Follow-Up - Mês 2" → **desativado**
- "Follow-Up - 2ª a 4ª semana" → **desativado**
- "Follow-Up - 3º até o 12º Mês" → **desativado**

Resultado: 743 leads acumulados em `follow_up` sem nenhuma automação ativa, ficando ali esquecidos.

### 4. IA não responde a algumas pessoas
Duas causas identificadas:
- **Phone Lock (90s)**: Se um lead envia mensagens rápidas em sequência, a segunda mensagem é **salva** mas **não processada pela IA** (lock de 90s). Isso é por design, mas pode parecer que a IA "ignorou".
- **Mensagens de mídia**: Quando o lead envia `[Media]` (fotos/vídeos), a IA recebe `[O cliente enviou uma foto]` mas pode não gerar resposta significativa, resultando em silêncio.
- **170 trackings ativos** com status `active` — muitos em `atendimento_ia`, enviando follow-ups automáticos que se sobrepõem à IA.

### 5. Pipeline confuso
Com o follow-up ativo enviando mensagens para leads em `atendimento_ia`, o pipeline fica desorganizado:
- Leads recebem mensagens da Gabi E mensagens de follow-up ao mesmo tempo
- O tracking cria registros para leads que nem deveriam ter follow-up ainda
- A resposta do lead ao follow-up é processada pela IA, gerando duas "linhas" de conversa

---

## Plano de Correção

### Passo 1: Corrigir erros de build
- Trocar `source: 'site'` por `source: 'website'` em `Contato.tsx` e `PublicVehicleDetails.tsx`

### Passo 2: Corrigir o fluxo de follow-up
- Alterar o fluxo "Follow up - Primeiro atendimento" para mirar `target_negotiation_status: ['follow_up']` em vez de `['atendimento_ia']`
- OU desativá-lo e deixar a Gabi gerenciar internamente a re-engajamento durante o atendimento IA

### Passo 3: Limpar trackings órfãos
- Cancelar os ~170 trackings ativos que estão vinculados a negociações em `atendimento_ia` (pois não deveriam ter follow-up externo nesse estágio)

### Passo 4: Ativar fluxos de follow-up reais
- Ativar pelo menos o fluxo "Follow-Up - Primeira semana" para que os 743 leads em `follow_up` recebam reativação

### Passo 5: Revisar lógica do process-follow-ups
- Adicionar uma salvaguarda: se a negociação está em `atendimento_ia`, o follow-up externo **nunca** deve disparar (isso é responsabilidade da IA)
- Garantir que follow-ups enviados são registrados como mensagens da instância da IA, mantendo contexto

---

## Resumo Visual

```text
ESTADO ATUAL (PROBLEMÁTICO):
Lead chega → atendimento_ia → Gabi responde
                             → Follow-up TAMBÉM envia (15min) ← CONFLITO!
                             → Lead responde ao follow-up
                             → Gabi responde sem contexto do follow-up

ESTADO CORRETO:
Lead chega → atendimento_ia → Gabi responde (total controle)
          → 24h sem resposta → follow_up → Fluxos de follow-up enviam
          → Lead responde → volta p/ atendimento_ia → Gabi retoma
```

