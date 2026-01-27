import { CodeBlock } from "../ui/CodeBlock";
import { SectionHeader } from "../ui/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Settings, Brain, MessageSquare, Shield, Thermometer, Gauge } from "lucide-react";

export function AgentConfigSection() {
  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Configuração do Agente IA" 
        description="Documentação detalhada de cada configuração do agente, como funciona, e boas práticas para evitar alucinações"
      />

      {/* Quick Summary */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Resumo Rápido - Configurações Anti-Alucinação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="font-semibold text-green-600 dark:text-green-400">✅ O que fazer:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Temperature entre <strong>0.3 - 0.4</strong></li>
                <li>Adicionar guardrails explícitos no prompt</li>
                <li>Base de conhecimento atualizada</li>
                <li>Instruções claras de "não sei"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-red-600 dark:text-red-400">❌ O que evitar:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Temperature alta ({'>'}0.6)</li>
                <li>Contexto com dados irrelevantes</li>
                <li>Prompts vagos ou genéricos</li>
                <li>Fallback que envia dados aleatórios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Temperature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" />
            Temperature (Temperatura)
          </CardTitle>
          <CardDescription>
            Controla a aleatoriedade/criatividade das respostas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-green-600">0.2 - 0.4</Badge>
                <span className="text-sm font-medium">Recomendado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Respostas precisas, factuais. Ideal para vendas, atendimento, consultas de estoque.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">0.5 - 0.6</Badge>
                <span className="text-sm font-medium">Moderado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Mais variado, mas ainda previsível. Pode gerar pequenas imprecisões.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">0.7 - 1.0</Badge>
                <span className="text-sm font-medium">Alto Risco</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Muito criativo/aleatório. <strong>CAUSA ALUCINAÇÕES!</strong> Não usar para vendas.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">⚠️ Como corrigimos:</p>
            <CodeBlock 
              language="typescript"
              code={`// Forçamos máximo de 0.4-0.5 mesmo se configurado mais alto
temperature: Math.min(agentConfig?.temperature || 0.35, 0.5)`}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            System Prompt (Prompt do Sistema)
          </CardTitle>
          <CardDescription>
            As instruções principais que definem o comportamento do agente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">O que incluir:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Identidade clara:</strong> Nome, gênero, tom de voz</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Objetivo:</strong> O que o agente deve fazer (vender, qualificar, agendar)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Guardrails anti-alucinação:</strong> Regras explícitas de "não inventar"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Exemplos:</strong> Mostre respostas corretas e incorretas</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-red-600">O que NÃO fazer:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Prompts vagos:</strong> "Seja um assistente prestativo"</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Liberdade demais:</strong> "Responda como achar melhor"</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm"><strong>Sem limitações:</strong> Não definir o que NÃO pode fazer</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Exemplo de guardrail eficaz:</p>
            <CodeBlock 
              language="markdown"
              code={`⚠️ REGRAS CRÍTICAS ANTI-ALUCINAÇÃO:
🚫 NUNCA invente informações sobre veículos!
- NUNCA diga que um carro está disponível se NÃO está na lista
- NUNCA invente cores, anos, versões ou preços

✅ SE NÃO SOUBER: "Deixa eu verificar e já te retorno!"
✅ SE O CARRO NÃO EXISTIR: "Não temos esse modelo, mas temos [CITE DA LISTA]"

Exemplo ERRADO:
Cliente: "Tem Civic 2007?"
IA: "Sim, temos prata!" ← INVENTOU!

Exemplo CORRETO:
Cliente: "Tem Civic 2007?"
IA: "O Civic 2007 não está disponível. Quer ver outras opções?"`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Base de Conhecimento (Knowledge Base)
          </CardTitle>
          <CardDescription>
            Informações estruturadas que o agente consulta para responder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A base de conhecimento é <strong>crítica</strong> para evitar alucinações. Se estiver vazia ou desatualizada, 
            o agente vai "inventar" respostas.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 text-green-600">✅ Deve conter:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• FAQs: horário, endereço, contato</li>
                <li>• Políticas: garantia, troca, financiamento</li>
                <li>• Scripts de vendas e objeções</li>
                <li>• Informações sobre serviços</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 text-amber-600">⚠️ Mantenha atualizado:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Promoções atuais</li>
                <li>• Taxas de financiamento</li>
                <li>• Horários especiais</li>
                <li>• Novidades do estoque</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Logic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Lógica de Fallback (Quando a busca falha)
          </CardTitle>
          <CardDescription>
            O que acontece quando o sistema não encontra informação relevante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-600 mb-2">❌ Problema anterior:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Se a busca RAG falhasse, o sistema enviava <strong>30 veículos aleatórios</strong> como contexto. 
              Isso fazia a IA falar de carros que não tinham nada a ver com o que o cliente perguntou.
            </p>
            <CodeBlock 
              language="typescript"
              code={`// CÓDIGO ANTIGO (RUIM):
if (relevantVehicles.length === 0) {
  // Buscava 30 carros ALEATÓRIOS - causava alucinação!
  const { data: vehicles } = await supabase
    .from('vehicles').select('*').limit(30);
}`}
            />
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-600 mb-2">✅ Correção aplicada:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Agora só buscamos veículos se o cliente realmente perguntou sobre veículos, e limitamos a 10.
            </p>
            <CodeBlock 
              language="typescript"
              code={`// CÓDIGO NOVO (CORRETO):
if (relevantVehicles.length === 0 && messageHasVehicleIntent) {
  // Só busca se cliente perguntou sobre carros
  const { data: vehicles } = await supabase
    .from('vehicles').select('*').limit(10);
} else if (relevantVehicles.length === 0) {
  // Não injeta veículos se não foi perguntado
  console.log('[RAG] Sem intenção de veículo - NÃO injetando contexto');
}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Other Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Outras Configurações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-1">Max Tokens</h4>
              <p className="text-sm text-muted-foreground">
                Limite de tokens na resposta. Valores muito baixos cortam respostas. <strong>Recomendado: 1024-2048</strong>
              </p>
            </div>
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-1">Context Window Size</h4>
              <p className="text-sm text-muted-foreground">
                Quantas mensagens anteriores o agente "lembra". <strong>Recomendado: 15-20</strong> para conversas de vendas.
              </p>
            </div>
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-1">Top P (nucleus sampling)</h4>
              <p className="text-sm text-muted-foreground">
                Outro controle de aleatoriedade. <strong>Recomendado: 0.8-0.9</strong> junto com temperature baixa.
              </p>
            </div>
            <div className="pb-4">
              <h4 className="font-semibold mb-1">Transfer Keywords</h4>
              <p className="text-sm text-muted-foreground">
                Palavras que ativam transferência para humano. Ex: "gerente", "reclamação", "humano", "vendedor"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices Summary */}
      <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">
            📋 Checklist de Configuração Segura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Temperature entre 0.3 - 0.4
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Guardrails anti-alucinação no prompt
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Base de conhecimento populada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Instruções de "não sei" claras
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Fallback não envia dados aleatórios
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Exemplos de erros no prompt
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Transfer keywords configuradas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" readOnly />
              Context window adequado (15-20)
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
