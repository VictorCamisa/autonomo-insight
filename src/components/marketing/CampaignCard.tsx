import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { MarketingCampaign, platformLabels } from '@/types/marketing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

interface CampaignCardProps {
  campaign: MarketingCampaign;
  onEdit?: (campaign: MarketingCampaign) => void;
  onDelete?: (id: string) => void;
}

export function CampaignCard({ campaign, onEdit, onDelete }: CampaignCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const budgetUsed = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {platformLabels[campaign.platform] || campaign.platform}
            </p>
          </div>
          <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
            {campaign.is_active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {(() => {
              const startDate = parseDate(campaign.start_date);
              const endDate = parseDate(campaign.end_date);
              const startFormatted = startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : '-';
              const endFormatted = endDate ? ` - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}` : '';
              return startFormatted + endFormatted;
            })()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Orçamento</span>
            <span className="font-medium">{formatCurrency(campaign.budget)}</span>
          </div>
          <Progress value={Math.min(budgetUsed, 100)} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Gasto: {formatCurrency(campaign.spent)}</span>
            <span>{budgetUsed.toFixed(1)}%</span>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(campaign)}>
                <Edit className="h-3 w-3 mr-1" /> Editar
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="destructive" onClick={() => onDelete(campaign.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Excluir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
