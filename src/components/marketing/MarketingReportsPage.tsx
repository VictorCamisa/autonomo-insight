import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Calendar, Mail, Plus, Play, Pause, 
  Download, Trash2, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { parseDate } from '@/lib/utils';
import type { ScheduledReport } from '@/types/marketing-module';

const reportTypeLabels: Record<string, { label: string; description: string }> = {
  weekly_performance: { 
    label: 'Performance Semanal', 
    description: 'Resumo de KPIs, top campanhas e insights' 
  },
  monthly_roi: { 
    label: 'ROI Mensal por Canal', 
    description: 'Retorno sobre investimento detalhado por canal' 
  },
  campaign_analysis: { 
    label: 'Análise de Campanhas', 
    description: 'Deep dive em cada campanha ativa' 
  },
  lost_leads: { 
    label: 'Leads Perdidos', 
    description: 'Análise de leads não convertidos' 
  },
};

const frequencyLabels: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export function MarketingReportsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    report_type: 'weekly_performance',
    frequency: 'weekly',
    recipients: '',
  });

  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyData = any;

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: async () => {
      const { data, error } = await (supabase as AnyData)
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScheduledReport[];
    },
  });

  // Create report mutation
  const createReport = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as AnyData)
        .from('scheduled_reports')
        .insert({
          name: newReport.name,
          report_type: newReport.report_type,
          frequency: newReport.frequency,
          recipients: newReport.recipients.split(',').map((e: string) => e.trim()).filter(Boolean),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setIsCreateOpen(false);
      setNewReport({ name: '', report_type: 'weekly_performance', frequency: 'weekly', recipients: '' });
      toast.success('Relatório agendado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar relatório');
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as AnyData)
        .from('scheduled_reports')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Status atualizado');
    },
  });

  // Delete report mutation
  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as AnyData)
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Relatório removido');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Automatizados</h1>
          <p className="text-muted-foreground">Agende relatórios para receber por email</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Relatório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Relatório</Label>
                <Input
                  value={newReport.name}
                  onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Relatório Semanal de Vendas"
                />
              </div>
              <div>
                <Label>Tipo de Relatório</Label>
                <Select
                  value={newReport.report_type}
                  onValueChange={(value) => setNewReport(prev => ({ ...prev, report_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypeLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportTypeLabels[newReport.report_type]?.description}
                </p>
              </div>
              <div>
                <Label>Frequência</Label>
                <Select
                  value={newReport.frequency}
                  onValueChange={(value) => setNewReport(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destinatários (emails separados por vírgula)</Label>
                <Input
                  value={newReport.recipients}
                  onChange={(e) => setNewReport(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createReport.mutate()}
                disabled={!newReport.name || !newReport.recipients}
              >
                Agendar Relatório
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Types Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(reportTypeLabels).map(([key, { label, description }]) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-sm">{label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatórios Agendados</CardTitle>
          <CardDescription>
            Gerencie seus relatórios automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${report.is_active ? 'bg-success/10' : 'bg-muted'}`}>
                      {report.is_active ? (
                        <Play className="h-4 w-4 text-success" />
                      ) : (
                        <Pause className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary">
                          {reportTypeLabels[report.report_type]?.label || report.report_type}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {frequencyLabels[report.frequency]}
                        </Badge>
                        <Badge variant="outline">
                          <Mail className="h-3 w-3 mr-1" />
                          {report.recipients?.length || 0} dest.
                        </Badge>
                      </div>
                      {report.last_sent_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Último envio: {(() => {
                            const date = parseDate(report.last_sent_at);
                            return date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Ativo</span>
                      <Switch
                        checked={report.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: report.id, is_active: checked })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteReport.mutate(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Nenhum relatório agendado</p>
              <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro relatório
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
