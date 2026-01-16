import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, GripVertical, Clock, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FollowUpStep {
  id?: string;
  step_order: number;
  delay_minutes: number;
  message_template: string;
  stop_if_qualified: boolean;
  stop_if_assigned_to_salesperson: boolean;
  stop_if_responded: boolean;
}

interface FollowUpStepEditorProps {
  step: FollowUpStep;
  stepIndex: number;
  onChange: (step: FollowUpStep) => void;
  onRemove: () => void;
  canRemove: boolean;
}

// Helper para converter minutos em texto legível
function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} hora${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dia${days > 1 ? 's' : ''}`;
}

// Opções de tempo pré-definidas
const timePresets = [
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 480, label: '8 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas' },
  { value: 2880, label: '2 dias' },
  { value: 4320, label: '3 dias' },
  { value: 10080, label: '1 semana' },
];

export function FollowUpStepEditor({
  step,
  stepIndex,
  onChange,
  onRemove,
  canRemove,
}: FollowUpStepEditorProps) {
  const updateField = <K extends keyof FollowUpStep>(field: K, value: FollowUpStep[K]) => {
    onChange({ ...step, [field]: value });
  };

  const isCustomTime = !timePresets.some(p => p.value === step.delay_minutes);

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle e número do passo */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            <Badge variant="outline" className="text-xs font-mono">
              {stepIndex + 1}
            </Badge>
          </div>

          <div className="flex-1 space-y-4">
            {/* Tempo de espera */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Esperar</span>
                <Select
                  value={isCustomTime ? 'custom' : step.delay_minutes.toString()}
                  onValueChange={(val) => {
                    if (val !== 'custom') {
                      updateField('delay_minutes', parseInt(val));
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tempo">
                      {isCustomTime ? formatDelay(step.delay_minutes) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {timePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value.toString()}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomTime && (
                  <Input
                    type="number"
                    min={1}
                    value={step.delay_minutes}
                    onChange={(e) => updateField('delay_minutes', parseInt(e.target.value) || 5)}
                    className="w-20"
                  />
                )}
                <span className="text-sm text-muted-foreground">sem resposta</span>
              </div>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Mensagem</Label>
              </div>
              <Textarea
                value={step.message_template}
                onChange={(e) => updateField('message_template', e.target.value)}
                placeholder="Olá {{nome}}, percebi que você ficou interessado em {{veiculo}}..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Use: {'{{nome}}'}, {'{{veiculo}}'}, {'{{vendedor}}'}, {'{{empresa}}'}
              </p>
            </div>

            {/* Condições de parada */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Não enviar se:</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={step.stop_if_qualified}
                    onCheckedChange={(checked) => updateField('stop_if_qualified', checked === true)}
                  />
                  Lead qualificado
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={step.stop_if_assigned_to_salesperson}
                    onCheckedChange={(checked) => updateField('stop_if_assigned_to_salesperson', checked === true)}
                  />
                  Passou pro vendedor
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={step.stop_if_responded}
                    onCheckedChange={(checked) => updateField('stop_if_responded', checked === true)}
                  />
                  Lead respondeu
                </label>
              </div>
            </div>
          </div>

          {/* Botão remover */}
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
