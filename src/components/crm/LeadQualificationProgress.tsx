import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Car, 
  DollarSign, 
  CreditCard, 
  RefreshCw, 
  Phone,
  User,
  MapPin,
  Wallet,
  Calendar,
  FileText,
  Briefcase,
  TrendingUp,
  ArrowRightLeft
} from 'lucide-react';
import { 
  useQualificationLevels, 
  useCurrentQualificationLevel,
  useQualificationLevel,
  calculateQualificationScore,
  FIELD_LABELS,
  type LeadQualificationData
} from '@/hooks/useQualificationSettings';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/crm';

// Icon mapping
const fieldIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  nome: User,
  telefone: Phone,
  veiculo_interesse: Car,
  origem: MapPin,
  forma_pagamento: CreditCard,
  orcamento: DollarSign,
  entrada: Wallet,
  parcela: Calendar,
  veiculo_troca: RefreshCw,
  tem_troca: ArrowRightLeft,
  cpf: FileText,
  nome_limpo: CheckCircle2,
  profissao: Briefcase,
  renda: TrendingUp,
};

interface LeadQualificationProgressProps {
  lead: Lead;
}

export function LeadQualificationProgress({ lead }: LeadQualificationProgressProps) {
  const { data: currentLevel = 'Q2' } = useCurrentQualificationLevel();
  const { data: levelConfig, isLoading } = useQualificationLevel(currentLevel);
  
  // Get qualification data from lead, merging with existing fields
  const qualificationData = useMemo(() => {
    const data: LeadQualificationData = {
      ...(lead.qualification_data as LeadQualificationData || {}),
    };
    
    // Auto-fill from lead fields if not in qualification_data
    if (lead.name && !data.nome) data.nome = lead.name;
    if (lead.phone && !data.telefone) data.telefone = lead.phone;
    if (lead.vehicle_interest && !data.veiculo_interesse) data.veiculo_interesse = lead.vehicle_interest;
    if (lead.source && !data.origem) data.origem = lead.source;
    
    return data;
  }, [lead]);
  
  // Calculate progress
  const progress = useMemo(() => {
    if (!levelConfig) return null;
    return calculateQualificationScore(qualificationData, levelConfig);
  }, [qualificationData, levelConfig]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!levelConfig || !progress) return null;

  const allFields = [...levelConfig.required_fields, ...levelConfig.optional_fields];
  
  const formatValue = (field: string, value: any) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') {
      if (field === 'orcamento' || field === 'entrada' || field === 'parcela' || field === 'renda') {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      }
      return value.toString();
    }
    return value;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Qualificação {currentLevel}
          </CardTitle>
          <Badge 
            variant={progress.status === 'complete' ? 'default' : 'secondary'}
            className={cn(
              progress.status === 'complete' && 'bg-green-500',
              progress.status === 'partial' && 'bg-amber-500',
            )}
          >
            {progress.status === 'complete' ? 'Completo' : 
             progress.status === 'partial' ? 'Em andamento' : 
             'Aguardando'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progresso</span>
            <span className="text-lg font-bold text-primary">{progress.score}%</span>
          </div>
          <Progress value={progress.score} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.collected.length} campos coletados</span>
            <span>{progress.missing.length} faltando</span>
          </div>
        </div>

        <Separator />

        {/* Required Fields */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Obrigatórios ({levelConfig.required_fields.length})
          </p>
          <div className="space-y-1.5">
            {levelConfig.required_fields.map((field) => {
              const Icon = fieldIcons[field] || Circle;
              const value = qualificationData[field as keyof LeadQualificationData];
              const isCollected = progress.collected.includes(field);
              const displayValue = formatValue(field, value);
              
              return (
                <FieldRow
                  key={field}
                  icon={Icon}
                  label={FIELD_LABELS[field] || field}
                  value={displayValue}
                  collected={isCollected}
                  required
                />
              );
            })}
          </div>
        </div>

        {/* Optional Fields */}
        {levelConfig.optional_fields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Opcionais / Bônus ({levelConfig.optional_fields.length})
              </p>
              <div className="space-y-1.5">
                {levelConfig.optional_fields.map((field) => {
                  const Icon = fieldIcons[field] || Circle;
                  const value = qualificationData[field as keyof LeadQualificationData];
                  const isCollected = progress.collected.includes(field);
                  const displayValue = formatValue(field, value);
                  
                  return (
                    <FieldRow
                      key={field}
                      icon={Icon}
                      label={FIELD_LABELS[field] || field}
                      value={displayValue}
                      collected={isCollected}
                      required={false}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Missing Required Fields Alert */}
        {progress.missing.length > 0 && (
          <>
            <Separator />
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-1">
              <p className="font-medium">⏳ Falta coletar:</p>
              <p className="text-amber-700 dark:text-amber-400">
                {progress.missing.map(f => FIELD_LABELS[f] || f).join(' • ')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ 
  icon: Icon, 
  label, 
  value, 
  collected,
  required
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string | null; 
  collected: boolean;
  required: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 p-2.5 rounded-lg transition-all",
      collected 
        ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" 
        : "bg-muted/50 border border-transparent"
    )}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
        collected 
          ? "bg-green-500 text-white" 
          : required
            ? "bg-amber-500/20 text-amber-600"
            : "bg-muted-foreground/20 text-muted-foreground"
      )}>
        {collected ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn(
            "text-sm",
            collected ? "text-muted-foreground" : "text-muted-foreground/70"
          )}>
            {label}
          </p>
          {!required && (
            <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">
              bônus
            </Badge>
          )}
        </div>
        {collected ? (
          <p className="font-semibold text-foreground truncate text-sm">{value}</p>
        ) : (
          <p className="text-muted-foreground/50 italic text-xs">Aguardando...</p>
        )}
      </div>
      {collected && (
        <Badge variant="secondary" className="text-[10px] py-0 flex-shrink-0">
          ✓
        </Badge>
      )}
    </div>
  );
}
