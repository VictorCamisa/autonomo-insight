
# Plano: Estoque Central com Sincronização Mercado Livre e Napista

## Resumo Executivo
Implementar seu sistema como estoque central (source of truth) que sincroniza automaticamente com Mercado Livre e Napista. Quando você criar, atualizar ou vender um veículo aqui, os anúncios são gerenciados automaticamente nas plataformas externas.

## Arquitetura Proposta
```text
+---------------------+
|   SEU SISTEMA       |
|   (Estoque Central) |
+----------+----------+
           |
           | Triggers/Hooks
           v
+----------+----------+
|  Edge Functions     |
|  (Sincronização)    |
+----+----------+-----+
     |          |
     v          v
+--------+ +---------+
|   ML   | | Napista |
| API    | | XML/API |
+--------+ +---------+
```

---

## Parte 1: Mercado Livre (Implementação Completa)

### 1.1 Pré-requisitos (Ação do Usuário)
Você precisará:
1. Acessar: https://developers.mercadolivre.com.br/
2. Criar uma aplicação (ou usar existente)
3. Configurar redirect URI: `https://ahfoixzdnpswuqavbmgf.supabase.co/functions/v1/ml-oauth-callback`
4. Obter: **Client ID** e **Client Secret**

### 1.2 Fluxo OAuth2 (Autenticação)
| Etapa | Descrição |
|-------|-----------|
| 1 | Usuário clica em "Conectar Mercado Livre" |
| 2 | Redirect para página de login do ML |
| 3 | Após autorizar, ML retorna um código |
| 4 | Edge function troca código por tokens |
| 5 | Tokens salvos na tabela `mercadolibre_tokens` |

### 1.3 Sincronização de Veículos

#### Criar Anúncio (Novo Veículo)
- Trigger: Quando veículo é inserido no sistema
- Ação: POST para `api.mercadolibre.com/items`
- Resultado: Salvar `ml_item_id` no veículo

#### Atualizar Anúncio
- Trigger: Quando veículo é editado (preço, fotos, descrição)
- Ação: PUT para `api.mercadolibre.com/items/{id}`

#### Encerrar Anúncio (Venda)
- Trigger: Quando status muda para `vendido`
- Ação: PUT `status: "closed"` + DELETE no ML

### 1.4 Componentes Técnicos

**Tabelas (já existe parcial)**:
- `mercadolibre_tokens` - Armazena tokens OAuth
- `vehicles` - Campos ML já existem: `ml_item_id`, `ml_status`, `ml_permalink`

**Secrets necessários**:
- `ML_CLIENT_ID` - Client ID da aplicação
- `ML_CLIENT_SECRET` - Client Secret da aplicação

**Edge Functions a criar**:
| Função | Propósito |
|--------|-----------|
| `ml-oauth-start` | Inicia fluxo OAuth (redirect para ML) |
| `ml-oauth-callback` | Recebe código e troca por tokens |
| `ml-sync-vehicle` | Cria/atualiza anúncio no ML |
| `ml-close-vehicle` | Encerra anúncio quando vendido |
| `ml-refresh-token` | Renova token expirado (cron) |

**Database Triggers**:
- `vehicle_insert` -> Chama `ml-sync-vehicle`
- `vehicle_update` -> Chama `ml-sync-vehicle` (se dados relevantes mudaram)
- `vehicle_status_vendido` -> Chama `ml-close-vehicle`

---

## Parte 2: Napista (Verificação Necessária)

### 2.1 Situação Atual
A Napista não possui API pública documentada. As opções de integração são:

| Método | Descrição |
|--------|-----------|
| **Via Parceiro** | Usar UsadosBR ou Revenda Mais que já integram |
| **Via XML** | Gerar XML do estoque e enviar periodicamente |
| **Email/Webhook** | Configurar e-mail de leads no painel Napista |

### 2.2 Recomendação: XML Automatizado
1. Criar edge function que gera XML do estoque
2. Hospedar em URL pública
3. Configurar Napista para consumir esse XML

**Endpoint**: `https://ahfoixzdnpswuqavbmgf.supabase.co/functions/v1/napista-xml`

### 2.3 Próximo Passo (Ação do Usuário)
Verificar no painel da Napista:
1. Existe opção de "Integração XML"?
2. Qual formato de XML é aceito?
3. Há frequência mínima de atualização?

---

## Parte 3: Interface de Configuração

### 3.1 Melhorar Dialog Mercado Livre
- Adicionar botão "Conectar com Mercado Livre" (OAuth)
- Mostrar status da conexão (conectado/desconectado)
- Exibir nickname do usuário ML conectado
- Toggle para ativar/desativar sincronização automática

### 3.2 Adicionar Dialog Napista
- Campo para URL do XML (se via parceiro)
- Botão para gerar XML manualmente
- Status da última sincronização

---

## Sequência de Implementação

### Fase 1: Configuração Base
1. Adicionar secrets do Mercado Livre (Client ID/Secret)
2. Criar edge function `ml-oauth-start`
3. Criar edge function `ml-oauth-callback`
4. Atualizar UI para iniciar conexão OAuth

### Fase 2: Sincronização ML
1. Criar edge function `ml-sync-vehicle`
2. Criar edge function `ml-close-vehicle`
3. Implementar database triggers
4. Adicionar cron para refresh de token

### Fase 3: Napista
1. Criar edge function `napista-xml` (gera XML do estoque)
2. Documentar configuração manual na Napista
3. Opcionalmente: webhook para leads

### Fase 4: Monitoramento
1. Logs de sincronização
2. Alertas de erro
3. Dashboard de status das integrações

---

## Detalhes Técnicos

### Estrutura do Item no Mercado Livre (Veículos)
```text
{
  "title": "Ford Ka 1.0 2020",
  "category_id": "MLB1744",  // Carros, Motos e Outros > Carros
  "price": 45000,
  "currency_id": "BRL",
  "available_quantity": 1,
  "buying_mode": "buy_it_now",
  "listing_type_id": "gold_special",
  "condition": "used",
  "pictures": [{"source": "url1"}, {"source": "url2"}],
  "attributes": [
    {"id": "BRAND", "value_name": "Ford"},
    {"id": "MODEL", "value_name": "Ka"},
    {"id": "VEHICLE_YEAR", "value_name": "2020"},
    {"id": "KILOMETERS", "value_name": "45000 km"},
    {"id": "FUEL_TYPE", "value_name": "Flex"},
    {"id": "TRANSMISSION", "value_name": "Manual"}
  ]
}
```

### Formato XML Napista (Padrão)
```text
<?xml version="1.0" encoding="UTF-8"?>
<veiculos>
  <veiculo>
    <codigo>123</codigo>
    <marca>Ford</marca>
    <modelo>Ka</modelo>
    <ano>2020</ano>
    <preco>45000</preco>
    <km>45000</km>
    <combustivel>Flex</combustivel>
    <cambio>Manual</cambio>
    <fotos>
      <foto>url1</foto>
      <foto>url2</foto>
    </fotos>
  </veiculo>
</veiculos>
```

---

## Estimativa de Trabalho

| Tarefa | Complexidade |
|--------|--------------|
| OAuth Mercado Livre | Alta |
| Sync Create/Update ML | Alta |
| Sync Venda (Close) ML | Média |
| Cron Token Refresh | Baixa |
| XML Napista | Média |
| UI de Configuração | Média |

**Total estimado**: 4-6 prompts para implementação completa

---

## Ação Imediata Necessária

Antes de começar a implementação, você precisa:

1. **Mercado Livre**: Criar aplicação em https://developers.mercadolivre.com.br/
   - Anotar Client ID e Client Secret
   - Configurar redirect URI

2. **Napista**: Verificar no painel:
   - Se existe opção de integração XML
   - Formato aceito
   - URL para cadastrar o feed

Quando tiver essas informações, podemos começar!
