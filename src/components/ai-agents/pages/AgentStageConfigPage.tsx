import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  MessageSquare, 
  Target, 
  ArrowRight, 
  Save,
  Zap,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface StageConfig {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  prompt: string;
  autoTransitions: {
    enabled: boolean;
    targetStage: string;
    condition: string;
  };
  actions: {
    notifySalesperson: boolean;
    syncCRM: boolean;
  };
}

const defaultStages: StageConfig[] = [
  {
    id: 'atendimento_ia',
    name: 'atendimento_ia',
    label: 'Em Atendimento IA',
    color: 'bg-blue-500',
    icon: <Bot className="h-4 w-4" />,
    prompt: `Você está no primeiro atendimento com o cliente.
Objetivos:
- Cumprimentar de forma cordial
- Identificar nome e interesse
- Qualificar o lead (Q1: nome/telefone, Q2: veículo/orçamento)
- Oferecer ajuda e informações sobre veículos`,
    autoTransitions: {
      enabled: true,
      targetStage: 'negociando',
      condition: 'Quando lead atingir Q2 (veículo identificado)',
    },
    actions: {
      notifySalesperson: true,
      syncCRM: true,
    },
  },
  {
    id: 'negociando',
    name: 'negociando',
    label: 'Negociando',
    color: 'bg-yellow-500',
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: `O lead está em negociação ativa com um vendedor.
Objetivos:
- Apoiar o vendedor com informações
- Responder dúvidas técnicas sobre veículos
- Auxiliar em simulações de financiamento
- Manter o lead engajado`,
    autoTransitions: {
      enabled: false,
      targetStage: '',
      condition: '',
    },
    actions: {
      notifySalesperson: true,
      syncCRM: true,
    },
  },
  {
    id: 'ganho',
    name: 'ganho',
    label: 'Ganho',
    color: 'bg-green-500',
    icon: <CheckCircle className="h-4 w-4" />,
    prompt: `A venda foi concretizada!
Objetivos:
- Parabenizar o cliente
- Confirmar detalhes da compra
- Orientar sobre próximos passos (documentação, entrega)
- Solicitar avaliação/indicações`,
    autoTransitions: {
      enabled: false,
      targetStage: '',
      condition: '',
    },
    actions: {
      notifySalesperson: true,
      syncCRM: true,
    },
  },
  {
    id: 'perdido',
    name: 'perdido',
    label: 'Perdido',
    color: 'bg-red-500',
    icon: <Target className="h-4 w-4" />,
    prompt: `O lead foi marcado como perdido.
Objetivos:
- Agradecer o contato
- Perguntar o motivo (se apropriado)
- Deixar porta aberta para futuro contato
- Oferecer desconto ou condição especial (última tentativa)`,
    autoTransitions: {
      enabled: false,
      targetStage: '',
      condition: '',
    },
    actions: {
      notifySalesperson: false,
      syncCRM: true,
    },
  },
];

export function AgentStageConfigPage() {
  const [stages, setStages] = useState<StageConfig[]>(defaultStages);
  const [activeStage, setActiveStage] = useState('atendimento_ia');
  const [isSaving, setIsSaving] = useState(false);

  const currentStage = stages.find(s => s.id === activeStage);

  const updateStage = (stageId: string, updates: Partial<StageConfig>) => {
    setStages(prev => prev.map(s => 
      s.id === stageId ? { ...s, ...updates } : s
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Aqui você salvaria no banco de dados
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configuração por Estágio</h2>
        <p className="text-muted-foreground">
          Personalize o comportamento da IA para cada estágio do pipeline
        </p>
      </div>

      {/* Tabs por Estágio */}
      <Tabs value={activeStage} onValueChange={setActiveStage}>
        <TabsList className="grid grid-cols-5 w-full">
          {stages.map((stage) => (
            <TabsTrigger key={stage.id} value={stage.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span className="hidden md:inline">{stage.label}</span>
              <span className="md:hidden">{stage.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {stages.map((stage) => (
          <TabsContent key={stage.id} value={stage.id} className="space-y-4 mt-4">
            {/* Prompt do Estágio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {stage.icon}
                  Prompt para {stage.label}
                </CardTitle>
                <CardDescription>
                  Instruções específicas que a IA seguirá quando o lead estiver neste estágio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={stage.prompt}
                  onChange={(e) => updateStage(stage.id, { prompt: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Digite as instruções para a IA..."
                />
              </CardContent>
            </Card>

            {/* Transições Automáticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Transições Automáticas
                </CardTitle>
                <CardDescription>
                  Configure quando a IA deve mover o lead para outro estágio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transição automática ativada</Label>
                    <p className="text-sm text-muted-foreground">
                      A IA moverá o lead automaticamente quando a condição for atendida
                    </p>
                  </div>
                  <Switch
                    checked={stage.autoTransitions.enabled}
                    onCheckedChange={(checked) => updateStage(stage.id, {
                      autoTransitions: { ...stage.autoTransitions, enabled: checked }
                    })}
                  />
                </div>

                {stage.autoTransitions.enabled && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <span className="font-medium">{stage.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">
                        {stages.find(s => s.name === stage.autoTransitions.targetStage)?.label || 'Não definido'}
                      </Badge>
                    </div>
                    <div className="pl-7 text-sm text-muted-foreground">
                      <strong>Condição:</strong> {stage.autoTransitions.condition}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Ações Automáticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Ações Automáticas
                </CardTitle>
                <CardDescription>
                  Ações que serão executadas quando o lead entrar neste estágio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Notificar vendedor</Label>
                      <p className="text-xs text-muted-foreground">
                        Envia notificação para o vendedor atribuído
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={stage.actions.notifySalesperson}
                    onCheckedChange={(checked) => updateStage(stage.id, {
                      actions: { ...stage.actions, notifySalesperson: checked }
                    })}
                  />
                </div>




                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Sincronizar com CRM</Label>
                      <p className="text-xs text-muted-foreground">
                        Atualiza status automaticamente no pipeline
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={stage.actions.syncCRM}
                    onCheckedChange={(checked) => updateStage(stage.id, {
                      actions: { ...stage.actions, syncCRM: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
