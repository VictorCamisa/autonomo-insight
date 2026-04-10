import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import type { Negotiation, NegotiationStatus, LossReasonType } from '@/types/negotiations';
import { negotiationStatusLabels, lossReasonLabels, objectionOptions } from '@/types/negotiations';

interface StageTransitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: Negotiation | null;
  targetStatus: NegotiationStatus | null;
  onConfirm: (data: StageTransitionData) => void;
}

export interface StageTransitionData {
  status: NegotiationStatus;
  estimated_value?: number;
  proposal_description?: string;
  notes?: string;
  objections?: string[];
  structured_loss_reason?: LossReasonType;
  loss_reason?: string;
  createVehicleAlert?: boolean;
}

export function StageTransitionModal({
  open,
  onOpenChange,
  negotiation,
  targetStatus,
  onConfirm,
}: StageTransitionModalProps) {
  const [estimatedValue, setEstimatedValue] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [objections, setObjections] = useState<string[]>([]);
  const [structuredLossReason, setStructuredLossReason] = useState<LossReasonType | ''>('');
  const [lossReason, setLossReason] = useState('');
  const [createVehicleAlert, setCreateVehicleAlert] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (open && negotiation) {
      setEstimatedValue(negotiation.estimated_value?.toString() || '');
      setProposalDescription('');
      setNotes(negotiation.notes || '');
      setObjections(negotiation.objections || []);
      setStructuredLossReason('');
      setLossReason('');
      setCreateVehicleAlert(false);
      setErrors([]);
    }
  }, [open, negotiation]);

  if (!negotiation || !targetStatus) return null;

  const getRequiredFields = () => {
    switch (targetStatus) {
      case 'negociando':
        return {
          title: 'Iniciar Negociação',
          description: 'Lead qualificado! Registre observações relevantes para a fase de negociação.',
          requireValue: false,
          showNotes: true,
        };
      case 'perdido':
        return {
          title: 'Marcar como Perdido',
          description: 'Registre o motivo da perda.',
          requireLossReason: true,
        };
      default:
        return null;
    }
  };

  const config = getRequiredFields();
  if (!config) return null;

  const handleConfirm = () => {
    const newErrors: string[] = [];

    if (config.requireValue && (!estimatedValue || parseFloat(estimatedValue) <= 0)) {
      newErrors.push('Informe o valor da proposta');
    }


    if (config.requireLossReason && !structuredLossReason) {
      newErrors.push('Selecione o motivo da perda');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: StageTransitionData = {
      status: targetStatus,
    };

    if (estimatedValue) {
      data.estimated_value = parseFloat(estimatedValue);
    }

    if (proposalDescription.trim()) {
      data.proposal_description = proposalDescription.trim();
    }

    if (notes.trim()) {
      data.notes = notes.trim();
    }

    if (objections.length > 0) {
      data.objections = objections;
    }

    if (structuredLossReason) {
      data.structured_loss_reason = structuredLossReason as LossReasonType;
    }

    if (lossReason.trim()) {
      data.loss_reason = lossReason.trim();
    }

    if (createVehicleAlert && structuredLossReason === 'veiculo_vendido') {
      data.createVehicleAlert = true;
    }

    onConfirm(data);
    onOpenChange(false);
  };

  const toggleObjection = (value: string) => {
    setObjections(prev => 
      prev.includes(value) 
        ? prev.filter(o => o !== value)
        : [...prev, value]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Negotiation Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">{negotiation.lead?.name || negotiation.customer?.name}</p>
            {negotiation.vehicle && (
              <p className="text-muted-foreground">
                {negotiation.vehicle.brand} {negotiation.vehicle.model} {negotiation.vehicle.year_model}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {negotiationStatusLabels[negotiation.status]} → {negotiationStatusLabels[targetStatus]}
            </p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              {errors.map((error, i) => (
                <p key={i} className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Proposal Value */}
          {config.requireValue && (
            <div className="space-y-2">
              <Label>Valor da Proposta (R$) *</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
              />
            </div>
          )}

          {/* Notes for negociando and follow_up */}
          {config.showNotes && (
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Registre pontos relevantes da negociação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Loss Reason Section - reorganized */}
          {config.requireLossReason && (
            <div className="space-y-2">
              <Label>Motivo da Perda *</Label>
              <Select 
                value={structuredLossReason} 
                onValueChange={(v) => setStructuredLossReason(v as LossReasonType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(lossReasonLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}


          {/* Additional details - now at the end */}
          {config.requireLossReason && (
            <div className="space-y-2">
              <Label>Observações adicionais</Label>
              <Textarea
                placeholder="Algum detalhe extra sobre a perda..."
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
