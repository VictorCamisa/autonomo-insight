import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NegotiationStatus } from '@/types/negotiations';
import { negotiationStatusLabels } from '@/types/negotiations';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings2, Zap, Clock, MessageCircle, Plus, ArrowRight, 
  PlayCircle, PauseCircle, Edit, Trash2, AlertTriangle,
  Bot, Handshake, Trophy, XCircle, Bell
} from 'lucide-react';
import { useFollowUpFlows, useUpdateFollowUpFlow } from '@/hooks/useFollowUpFlows';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PipelineColumnSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: NegotiationStatus;
}

// Ícones por estágio
const stageIcons: Record<NegotiationStatus, React.ReactNode> = {
  atendimento_ia: <Bot className="h-5 w-5" />,
  negociando: <Handshake className="h-5 w-5" />,
  follow_up: <Clock className="h-5 w-5" />,
  ganho: <Trophy className="h-5 w-5" />,
  perdido: <XCircle className="h-5 w-5" />,
};

// Descrições por estágio
const stageDescriptions: Record<NegotiationStatus, string> = {
  atendimento_ia: 'Leads sendo atendidos pela IA (Gabi). A IA qualifica e agenda para vendedores.',
  negociando: 'Leads qualificados em negociação ativa com vendedores.',
  follow_up: 'Leads sem resposta há 24h+. Fluxos automáticos de reengajamento.',
  ganho: 'Negociações convertidas em vendas.',
  perdido: 'Negociações perdidas. Possível reativação futura.',
};

// Regras automáticas por estágio
const stageAutomations: Record<NegotiationStatus, { icon: React.ReactNode; title: string; description: string }[]> = {
  atendimento_ia: [
    { icon: <Bot className="h-4 w-4" />, title: 'Gabi responde automaticamente', description: 'IA ativa 24/7 via WhatsApp' },
    { icon: <ArrowRight className="h-4 w-4" />, title: 'Transição para Negociando', description: 'Ao atingir Q2 (veículo confirmado)' },
    { icon: <Bell className="h-4 w-4" />, title: 'Notifica vendedor', description: 'Quando qualificado' },
  ],
  negociando: [
    { icon: <Clock className="h-4 w-4" />, title: 'Timeout 24h', description: 'Move para Follow-up se sem resposta' },
    { icon: <ArrowRight className="h-4 w-4" />, title: 'Retorno automático', description: 'Volta ao atendimento se lead responder' },
  ],
  follow_up: [
    { icon: <Zap className="h-4 w-4" />, title: 'Fluxos automáticos', description: 'Envia mensagens de reengajamento' },
    { icon: <ArrowRight className="h-4 w-4" />, title: 'Reativação', description: 'Volta para IA se lead responder' },
  ],
  ganho: [
    { icon: <Trophy className="h-4 w-4" />, title: 'Registro de venda', description: 'Cria venda automaticamente' },
    { icon: <Zap className="h-4 w-4" />, title: 'Comissão gerada', description: 'Calcula comissão do vendedor' },
  ],
  perdido: [
    { icon: <Clock className="h-4 w-4" />, title: 'Período de carência', description: 'Aguarda antes de reativar' },
  ],
};

export function PipelineColumnSettings({ open, onOpenChange, stage }: PipelineColumnSettingsProps) {
  const navigate = useNavigate();
  const { data: flows, isLoading: flowsLoading } = useFollowUpFlows();
  const updateFlow = useUpdateFollowUpFlow();

  // Filtra fluxos que atuam neste estágio
  const stageFlows = flows?.filter(flow => 
    flow.target_negotiation_status?.includes(stage)
  ) || [];

  const handleToggleFlow = (flowId: string, currentActive: boolean) => {
    updateFlow.mutate(
      { id: flowId, is_active: !currentActive },
      {
        onSuccess: () => {
          toast.success(`Fluxo ${!currentActive ? 'ativado' : 'desativado'}`);
        },
      }
    );
  };

  const handleEditFlow = (flowId: string) => {
    onOpenChange(false);
    navigate(`/crm/follow-up?edit=${flowId}`);
  };

  const handleCreateFlow = () => {
    onOpenChange(false);
    navigate(`/crm/follow-up?create=true&stage=${stage}`);
  };

  const formatDelay = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    }
    const days = Math.floor(minutes / 1440);
    return `${days}d`;
  };

  const automations = stageAutomations[stage] || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {stageIcons[stage]}
            </div>
            <div>
              <SheetTitle>{negotiationStatusLabels[stage]}</SheetTitle>
              <SheetDescription className="text-left">
                {stageDescriptions[stage]}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Regras automáticas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Automações Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {automations.length > 0 ? (
                automations.map((auto, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="mt-0.5 text-muted-foreground">{auto.icon}</div>
                    <div>
                      <p className="text-sm font-medium">{auto.title}</p>
                      <p className="text-xs text-muted-foreground">{auto.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma automação configurada</p>
              )}
            </CardContent>
          </Card>

          {/* Fluxos de Follow-up (apenas para estágios relevantes) */}
          {['atendimento_ia', 'negociando', 'follow_up', 'perdido'].includes(stage) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    Fluxos de Follow-up
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleCreateFlow}>
                    <Plus className="h-3 w-3 mr-1" />
                    Criar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {flowsLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : stageFlows.length > 0 ? (
                  stageFlows.map((flow) => (
                    <div
                      key={flow.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{flow.name}</p>
                          <Badge variant={flow.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {flow.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        {flow.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {flow.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Switch
                          checked={flow.is_active}
                          onCheckedChange={() => handleToggleFlow(flow.id, flow.is_active)}
                          disabled={updateFlow.isPending}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEditFlow(flow.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum fluxo para este estágio
                    </p>
                    <Button
                      size="sm"
                      variant="link"
                      className="mt-1"
                      onClick={handleCreateFlow}
                    >
                      Criar primeiro fluxo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estatísticas do estágio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Configurações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/crm/follow-up');
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Gerenciar todos os fluxos
              </Button>
              
              {stage === 'atendimento_ia' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/ai-agents');
                  }}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Configurar Gabi (IA)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
