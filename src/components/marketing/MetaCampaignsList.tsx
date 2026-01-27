import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, parseDate } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MetaCampaign } from '@/types/meta-ads';
import { statusLabels, statusColors, objectiveLabels } from '@/types/meta-ads';

interface MetaCampaignsListProps {
  campaigns: MetaCampaign[];
  isLoading: boolean;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = parseDate(dateString);
  return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
};

export default function MetaCampaignsList({ campaigns, isLoading }: MetaCampaignsListProps) {
  const [search, setSearch] = useState('');

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Campanhas do Meta Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Campanhas do Meta Ads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma campanha encontrada.</p>
            <p className="text-sm">Clique em &quot;Sincronizar&quot; para buscar campanhas do Meta Ads.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Campanhas do Meta Ads</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead className="text-right">Orçamento Diário</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Última Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow 
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        'text-white',
                        statusColors[campaign.status] || 'bg-gray-500'
                      )}
                    >
                      {statusLabels[campaign.status] || campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {campaign.objective ? (objectiveLabels[campaign.objective] || campaign.objective) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(campaign.daily_budget)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.start_time)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(campaign.last_sync_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredCampaigns.length} de {campaigns.length} campanhas
        </div>
      </CardContent>
    </Card>
  );
}
