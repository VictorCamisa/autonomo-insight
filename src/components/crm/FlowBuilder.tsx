import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Clock, 
  MessageSquare, 
  ArrowDown,
  Save,
  Play,
  Pause,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

interface FlowStep {
  id: string;
  order: number;
  delayMinutes: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  message: string;
  stopConditions: {
    ifResponded: boolean;
    ifQualified: boolean;
    ifAssigned: boolean;
  };
}

interface FlowConfig {
  name: string;
  description: string;
  isActive: boolean;
  trigger: 'no_response' | 'lost' | 'new_lead' | 'manual';
  targetStatus: string[];
  steps: FlowStep[];
}

const defaultStep: Omit<FlowStep, 'id' | 'order'> = {
  delayMinutes: 24 * 60,
  delayUnit: 'hours',
  message: '',
  stopConditions: {
    ifResponded: true,
    ifQualified: false,
    ifAssigned: false,
  },
};

export function FlowBuilder() {
  const [config, setConfig] = useState<FlowConfig>({
    name: '',
    description: '',
    isActive: true,
    trigger: 'no_response',
    targetStatus: [],
    steps: [],
  });

  const addStep = () => {
    const newStep: FlowStep = {
      ...defaultStep,
      id: crypto.randomUUID(),
      order: config.steps.length + 1,
    };
    setConfig(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const removeStep = (stepId: string) => {
    setConfig(prev => ({
      ...prev,
      steps: prev.steps
        .filter(s => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    setConfig(prev => ({
      ...prev,
      steps: prev.steps.map(s => 
        s.id === stepId ? { ...s, ...updates } : s
      ),
    }));
  };

  const convertToMinutes = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
      case 'hours': return value * 60;
      case 'days': return value * 24 * 60;
      default: return value;
    }
  };

  const getDisplayDelay = (minutes: number): { value: number; unit: 'minutes' | 'hours' | 'days' } => {
    if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) {
      return { value: minutes / (24 * 60), unit: 'days' };
    } else if (minutes >= 60 && minutes % 60 === 0) {
      return { value: minutes / 60, unit: 'hours' };
    }
    return { value: minutes, unit: 'minutes' };
  };

  const handleSave = () => {
    if (!config.name) {
      toast.error('Nome do fluxo é obrigatório');
      return;
    }
    if (config.steps.length === 0) {
      toast.error('Adicione pelo menos um passo ao fluxo');
      return;
    }
    // Aqui você integraria com o hook de follow-up flows
    toast.success('Fluxo salvo com sucesso!');
    console.log('Flow config:', config);
  };

  const triggerLabels: Record<string, string> = {
    no_response: 'Sem resposta',
    lost: 'Lead perdido',
    new_lead: 'Novo lead',
    manual: 'Manual',
  };

  return (
    <div className="space-y-6">
      {/* Configurações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurações do Fluxo
          </CardTitle>
          <CardDescription>
            Configure o gatilho e condições gerais do fluxo de automação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fluxo</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Reativação Semanal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">Gatilho</Label>
              <Select 
                value={config.trigger} 
                onValueChange={(value: FlowConfig['trigger']) => 
                  setConfig(prev => ({ ...prev, trigger: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_response">Sem resposta (24h+)</SelectItem>
                  <SelectItem value="lost">Lead perdido</SelectItem>
                  <SelectItem value="new_lead">Novo lead</SelectItem>
                  <SelectItem value="manual">Acionamento manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o objetivo deste fluxo..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.isActive}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Fluxo ativo</Label>
            </div>
            <Badge variant={config.isActive ? 'default' : 'secondary'}>
              {config.isActive ? (
                <><Play className="h-3 w-3 mr-1" /> Ativo</>
              ) : (
                <><Pause className="h-3 w-3 mr-1" /> Pausado</>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Editor Visual de Passos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Passos do Fluxo
            </span>
            <Button onClick={addStep} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Passo
            </Button>
          </CardTitle>
          <CardDescription>
            Configure a sequência de mensagens e intervalos de tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config.steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum passo configurado</p>
              <p className="text-sm">Clique em "Adicionar Passo" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {config.steps.map((step, index) => {
                const displayDelay = getDisplayDelay(step.delayMinutes);
                
                return (
                  <div key={step.id} className="relative">
                    {index > 0 && (
                      <div className="absolute left-6 -top-4 h-4 border-l-2 border-dashed border-muted-foreground/30" />
                    )}
                    
                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {step.order}
                          </Badge>
                        </div>

                        <div className="flex-1 space-y-4">
                          {/* Delay */}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Aguardar</span>
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={displayDelay.value}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 1;
                                updateStep(step.id, {
                                  delayMinutes: convertToMinutes(newValue, step.delayUnit)
                                });
                              }}
                            />
                            <Select 
                              value={step.delayUnit}
                              onValueChange={(value: FlowStep['delayUnit']) => {
                                updateStep(step.id, {
                                  delayUnit: value,
                                  delayMinutes: convertToMinutes(displayDelay.value, value)
                                });
                              }}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutos</SelectItem>
                                <SelectItem value="hours">Horas</SelectItem>
                                <SelectItem value="days">Dias</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Mensagem */}
                          <div className="space-y-2">
                            <Label className="text-sm">Mensagem</Label>
                            <Textarea
                              value={step.message}
                              onChange={(e) => updateStep(step.id, { message: e.target.value })}
                              placeholder="Olá {nome}, vi que você estava interessado em {veiculo}..."
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              Variáveis: {'{nome}'}, {'{veiculo}'}, {'{vendedor}'}, {'{empresa}'}
                            </p>
                          </div>

                          {/* Condições de Parada */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <label className="flex items-center gap-2">
                              <Switch
                                checked={step.stopConditions.ifResponded}
                                onCheckedChange={(checked) => updateStep(step.id, {
                                  stopConditions: { ...step.stopConditions, ifResponded: checked }
                                })}
                              />
                              <span>Parar se responder</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <Switch
                                checked={step.stopConditions.ifQualified}
                                onCheckedChange={(checked) => updateStep(step.id, {
                                  stopConditions: { ...step.stopConditions, ifQualified: checked }
                                })}
                              />
                              <span>Parar se qualificado</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <Switch
                                checked={step.stopConditions.ifAssigned}
                                onCheckedChange={(checked) => updateStep(step.id, {
                                  stopConditions: { ...step.stopConditions, ifAssigned: checked }
                                })}
                              />
                              <span>Parar se atribuído</span>
                            </label>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {index < config.steps.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Fluxo
        </Button>
      </div>
    </div>
  );
}
