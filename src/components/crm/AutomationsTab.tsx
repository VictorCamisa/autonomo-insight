import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Zap,
  Plus,
  Bot,
  Clock,
  MessageCircle,
  Bell,
  Target,
  TrendingDown,
  ArrowRight,
  Settings2,
  PlayCircle,
  PauseCircle,
  Trash2,
  Pencil,
  ChevronRight,
  Timer,
  RefreshCcw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Workflow,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useLossRecoveryRules, 
  useDeleteLossRecoveryRule, 
  useToggleLossRecoveryRule,
  LossRecoveryRule,
  actionTypeLabels,
  ActionType 
} from '@/hooks/useLossRecoveryRules';
import { useFollowUpFlows, useToggleFollowUpFlow, useDeleteFollowUpFlow } from '@/hooks/useFollowUpFlows';
import { useFollowUpSettings } from '@/hooks/useFollowUpSettings';
import { lossReasonLabels, LossReasonType } from '@/types/negotiations';

interface AutomationsTabProps {
  onCreateLossRule: () => void;
  onEditLossRule: (rule: LossRecoveryRule) => void;
  onCreateFlow: () => void;
  onEditFlow: (flow: any) => void;
}

// Cards visuais para tipos de automação
const automationTypes = [
  {
    id: 'follow_up_flows',
    title: 'Fluxos de Follow-up',
    description: 'Sequências de mensagens para reengajar leads sem resposta',
    icon: Workflow,
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'loss_recovery',
    title: 'Recuperação de Perdas',
    description: 'Ações automáticas quando uma negociação é perdida',
    icon: TrendingDown,
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
];

// Card de resumo de automação
function AutomationSummaryCard({ 
  type, 
  activeCount, 
  totalCount,
  isSelected,
  onClick 
}: { 
  type: typeof automationTypes[0];
  activeCount: number;
  totalCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = type.icon;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? `ring-2 ring-primary ${type.bgColor}` 
          : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${type.bgColor}`}>
            <Icon className={`h-6 w-6 ${type.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{type.title}</h3>
              {activeCount > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {activeCount} ativas
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{totalCount} regra{totalCount !== 1 ? 's' : ''} configurada{totalCount !== 1 ? 's' : ''}</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card compacto para regra/fluxo
function RuleCard({
  title,
  description,
  isActive,
  icon: Icon,
  badges,
  timing,
  onToggle,
  onEdit,
  onDelete,
  color = 'blue',
}: {
  title: string;
  description?: string;
  isActive: boolean;
  icon: React.ElementType;
  badges?: string[];
  timing?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  color?: 'blue' | 'orange' | 'green' | 'purple';
}) {
  const [showDelete, setShowDelete] = useState(false);
  
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <>
      <div className={`group relative p-4 rounded-lg border transition-all hover:shadow-sm ${
        isActive ? 'bg-card' : 'bg-muted/30 opacity-70'
      }`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{title}</span>
              <Badge 
                variant={isActive ? 'default' : 'secondary'}
                className={`text-[10px] px-1.5 py-0 ${isActive ? 'bg-green-600' : ''}`}
              >
                {isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-2">
              {timing && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timing}
                </span>
              )}
              
              {badges && badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {badges.slice(0, 2).map((badge, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                      {badge}
                    </Badge>
                  ))}
                  {badges.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{badges.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={isActive}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-green-600"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              A automação "{title}" será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDelete(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Componente para área vazia
function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function AutomationsTab({ 
  onCreateLossRule, 
  onEditLossRule, 
  onCreateFlow, 
  onEditFlow 
}: AutomationsTabProps) {
  const [selectedType, setSelectedType] = useState<string>('follow_up_flows');
  
  // Dados
  const { data: flows = [], isLoading: loadingFlows } = useFollowUpFlows();
  const { data: lossRules = [], isLoading: loadingRules } = useLossRecoveryRules();
  const { settings } = useFollowUpSettings();
  
  // Mutations
  const toggleFlow = useToggleFollowUpFlow();
  const deleteFlow = useDeleteFollowUpFlow();
  const toggleLossRule = useToggleLossRecoveryRule();
  const deleteLossRule = useDeleteLossRecoveryRule();
  
  // Contadores
  const activeFlows = flows.filter(f => f.is_active).length;
  const activeLossRules = lossRules.filter(r => r.is_active).length;
  
  // Helper para formatar timing
  const formatTiming = (delayDays: number, delayHours: number) => {
    if (delayDays === 0 && delayHours === 0) return 'Imediato';
    const parts = [];
    if (delayDays > 0) parts.push(`${delayDays}d`);
    if (delayHours > 0) parts.push(`${delayHours}h`);
    return parts.join(' ');
  };
  
  const isLoading = loadingFlows || loadingRules;
  
  return (
    <div className="space-y-6">
      {/* Header com status geral */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Central de Automações
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure regras automáticas para follow-up e recuperação de leads
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${settings?.automation_enabled 
              ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700' 
              : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${settings?.automation_enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {settings?.automation_enabled ? 'Automação Ativa' : 'Automação Pausada'}
          </Badge>
        </div>
      </div>
      
      {/* Cards de tipos de automação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AutomationSummaryCard
          type={automationTypes[0]}
          activeCount={activeFlows}
          totalCount={flows.length}
          isSelected={selectedType === 'follow_up_flows'}
          onClick={() => setSelectedType('follow_up_flows')}
        />
        <AutomationSummaryCard
          type={automationTypes[1]}
          activeCount={activeLossRules}
          totalCount={lossRules.length}
          isSelected={selectedType === 'loss_recovery'}
          onClick={() => setSelectedType('loss_recovery')}
        />
      </div>
      
      {/* Área de conteúdo baseada na seleção */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {selectedType === 'follow_up_flows' ? 'Fluxos de Follow-up' : 'Regras de Recuperação'}
              </CardTitle>
              <CardDescription>
                {selectedType === 'follow_up_flows' 
                  ? 'Sequências automáticas de mensagens para leads inativos' 
                  : 'Ações automáticas baseadas no motivo de perda da negociação'
                }
              </CardDescription>
            </div>
            
            <Button 
              onClick={selectedType === 'follow_up_flows' ? onCreateFlow : onCreateLossRule}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {selectedType === 'follow_up_flows' ? 'Novo Fluxo' : 'Nova Regra'}
            </Button>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : selectedType === 'follow_up_flows' ? (
            // Lista de Fluxos
            flows.length === 0 ? (
              <EmptyState
                icon={Workflow}
                title="Nenhum fluxo configurado"
                description="Crie fluxos de follow-up para enviar mensagens automáticas quando leads ficarem inativos"
                action={
                  <Button onClick={onCreateFlow} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Fluxo
                  </Button>
                }
              />
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {flows.map(flow => (
                    <RuleCard
                      key={flow.id}
                      title={flow.name}
                      description={flow.description || undefined}
                      isActive={flow.is_active}
                      icon={MessageCircle}
                      badges={flow.target_negotiation_status || []}
                      timing={formatTiming(flow.delay_days || 0, flow.delay_hours || 0)}
                      color="blue"
                      onToggle={() => toggleFlow.mutate({ id: flow.id, is_active: !flow.is_active })}
                      onEdit={() => onEditFlow(flow)}
                      onDelete={() => deleteFlow.mutate(flow.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )
          ) : (
            // Lista de Regras de Perda
            lossRules.length === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title="Nenhuma regra configurada"
                description="Crie regras para ações automáticas quando negociações são marcadas como perdidas"
                action={
                  <Button onClick={onCreateLossRule} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Regra
                  </Button>
                }
              />
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {lossRules.map(rule => (
                    <RuleCard
                      key={rule.id}
                      title={rule.name}
                      description={rule.description || undefined}
                      isActive={rule.is_active}
                      icon={rule.action_type === 'whatsapp_message' ? MessageCircle : Bell}
                      badges={rule.trigger_loss_reasons.map(r => lossReasonLabels[r as LossReasonType] || r)}
                      timing={formatTiming(rule.delay_days, rule.delay_hours)}
                      color="orange"
                      onToggle={() => toggleLossRule.mutate({ id: rule.id, is_active: !rule.is_active })}
                      onEdit={() => onEditLossRule(rule)}
                      onDelete={() => deleteLossRule.mutate(rule.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )
          )}
        </CardContent>
      </Card>
      
      {/* Dicas */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">Dicas para melhores resultados:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>Fluxos de Follow-up:</strong> Configure sequências progressivas com intervalos crescentes (1h → 24h → 72h)</li>
                <li>• <strong>Recuperação de Perdas:</strong> Use mensagens personalizadas por motivo de perda para maior eficácia</li>
                <li>• <strong>Horários:</strong> Evite envios em horários fora do comercial (antes das 8h ou após as 20h)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
