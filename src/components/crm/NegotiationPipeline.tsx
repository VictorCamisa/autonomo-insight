import { useState } from 'react';
import { NegotiationCard } from './NegotiationCard';
import type { Negotiation, NegotiationStatus } from '@/types/negotiations';
import { negotiationStatusLabels, pipelineColumns } from '@/types/negotiations';
import { useUpdateNegotiation } from '@/hooks/useNegotiations';
import { Plus, Target, Bot, Handshake, Clock, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleFromNegotiationModal } from '@/components/sales/SaleFromNegotiationModal';
import { StageTransitionModal, StageTransitionData } from './StageTransitionModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NegotiationPipelineProps {
  negotiations: Negotiation[];
  onNegotiationClick?: (negotiation: Negotiation) => void;
  onCreateNegotiation?: () => void;
  onCreateLead?: () => void;
  showSalesperson?: boolean;
}

// Ícones e cores para cada estágio
const stageConfig: Record<NegotiationStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  atendimento_ia: {
    icon: <Bot className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
  },
  negociando: {
    icon: <Handshake className="h-4 w-4" />,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800',
  },
  follow_up: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
  },
  ganho: {
    icon: <Trophy className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800',
  },
  perdido: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
  },
};

export function NegotiationPipeline({ 
  negotiations, 
  onNegotiationClick, 
  onCreateNegotiation,
  onCreateLead,
  showSalesperson 
}: NegotiationPipelineProps) {
  const updateNegotiation = useUpdateNegotiation();
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [pendingWonNegotiation, setPendingWonNegotiation] = useState<Negotiation | null>(null);
  
  // Stage transition modal state
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    negotiation: Negotiation;
    targetStatus: NegotiationStatus;
  } | null>(null);

  const getNegotiationsByStatus = (status: NegotiationStatus) => {
    // "negociando" agrega negociando + follow_up (legado)
    if (status === 'negociando') {
      return negotiations.filter(n => n.status === 'negociando' || n.status === 'follow_up');
    }
    return negotiations.filter(n => n.status === status);
  };

  const handleDragStart = (e: React.DragEvent, negotiationId: string) => {
    e.dataTransfer.setData('negotiationId', negotiationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Estágios que requerem modal de transição
  const stagesRequiringModal: NegotiationStatus[] = ['negociando', 'perdido'];

  const handleDrop = (e: React.DragEvent, newStatus: NegotiationStatus) => {
    e.preventDefault();
    const negotiationId = e.dataTransfer.getData('negotiationId');
    if (!negotiationId) return;

    const negotiation = negotiations.find(n => n.id === negotiationId);
    if (!negotiation) return;

    // Se mesmo status, não faz nada
    if (negotiation.status === newStatus) return;

    // "Ganho" abre modal de venda
    if (newStatus === 'ganho') {
      setPendingWonNegotiation(negotiation);
      setSaleModalOpen(true);
      return;
    }

    // Estágios que requerem modal de transição
    if (stagesRequiringModal.includes(newStatus)) {
      setPendingTransition({ negotiation, targetStatus: newStatus });
      setTransitionModalOpen(true);
      return;
    }

    // Outras transições: atualização direta
    updateNegotiation.mutate({ id: negotiationId, status: newStatus });
  };

  const handleTransitionConfirm = (data: StageTransitionData) => {
    if (!pendingTransition) return;

    updateNegotiation.mutate({
      id: pendingTransition.negotiation.id,
      status: data.status,
      estimated_value: data.estimated_value,
      notes: data.notes || data.proposal_description,
      objections: data.objections,
      structured_loss_reason: data.structured_loss_reason,
      loss_reason: data.loss_reason,
    });

    setPendingTransition(null);
  };

  const handleSaleSuccess = () => {
    if (pendingWonNegotiation) {
      updateNegotiation.mutate({ 
        id: pendingWonNegotiation.id, 
        status: 'ganho',
        actual_close_date: new Date().toISOString().split('T')[0]
      });
    }
    setPendingWonNegotiation(null);
  };

  const handleSaleCancel = () => {
    setPendingWonNegotiation(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const totalPipelineValue = negotiations
    .filter(n => !['ganho', 'perdido'].includes(n.status))
    .reduce((sum, n) => sum + (n.estimated_value || 0), 0);

  const activeNegotiationsCount = negotiations.filter(n => !['ganho', 'perdido'].includes(n.status)).length;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Pipeline de Vendas</h2>
            <p className="text-sm text-muted-foreground">
              {activeNegotiationsCount} negociações ativas • {formatCurrency(totalPipelineValue)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onCreateLead && (
            <Button onClick={onCreateLead} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          )}
          {onCreateNegotiation && (
            <Button onClick={onCreateNegotiation} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Negociação
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 pb-4 h-full" style={{ minWidth: 'max-content' }}>
          {pipelineColumns.map((status) => {
            const columnNegotiations = getNegotiationsByStatus(status);
            const totalValue = columnNegotiations.reduce((sum, n) => sum + (n.estimated_value || 0), 0);
            const config = stageConfig[status];

            return (
              <div
                key={status}
                className={`flex-shrink-0 w-72 rounded-lg border ${config.bgColor} flex flex-col h-full transition-colors`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="p-3 rounded-t-lg shrink-0 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <h3 className="font-semibold text-sm">
                        {negotiationStatusLabels[status]}
                      </h3>
                    </div>
                    <span className="text-xs font-medium bg-background text-foreground px-2 py-0.5 rounded-full">
                      {columnNegotiations.length}
                    </span>
                  </div>
                  {totalValue > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {formatCurrency(totalValue)}
                    </p>
                  )}
                </div>

                {/* Column Content */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {columnNegotiations.map((negotiation) => (
                    <div
                      key={negotiation.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, negotiation.id)}
                      className="cursor-grab active:cursor-grabbing active:opacity-70 transition-opacity"
                    >
                      <NegotiationCard
                        negotiation={negotiation}
                        onClick={() => onNegotiationClick?.(negotiation)}
                        showSalesperson={showSalesperson}
                      />
                    </div>
                  ))}
                  
                  {columnNegotiations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg bg-background/50">
                      <span className={`mb-1 ${config.color}`}>{config.icon}</span>
                      <span className="text-xs">Arraste negociações aqui</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para criar venda */}
      <SaleFromNegotiationModal
        open={saleModalOpen}
        onOpenChange={setSaleModalOpen}
        negotiation={pendingWonNegotiation}
        onSuccess={handleSaleSuccess}
        onCancel={handleSaleCancel}
      />

      {/* Modal de transição de estágio */}
      <StageTransitionModal
        open={transitionModalOpen}
        onOpenChange={setTransitionModalOpen}
        negotiation={pendingTransition?.negotiation || null}
        targetStatus={pendingTransition?.targetStatus || null}
        onConfirm={handleTransitionConfirm}
      />
    </div>
  );
}
