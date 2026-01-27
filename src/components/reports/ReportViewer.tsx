import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Calendar, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

interface AIReport {
  title: string;
  period?: { from: string; to: string };
  kpis?: { label: string; value: string; trend?: string }[];
  sections?: { title: string; content: string }[];
  insights?: string[];
  generatedAt: string;
}

interface ReportViewerProps {
  report: AIReport;
}

function getTrendIcon(trend?: string) {
  if (!trend) return null;
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function ReportViewer({ report }: ReportViewerProps) {
  const handleExport = () => {
    // Create a simple text export
    const generatedDate = parseDate(report.generatedAt);
    let content = `${report.title}\n`;
    content += `Gerado em: ${generatedDate ? format(generatedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}\n\n`;
    
    if (report.period) {
      content += `Período: ${report.period.from} - ${report.period.to}\n\n`;
    }

    if (report.kpis) {
      content += '=== INDICADORES ===\n';
      report.kpis.forEach(kpi => {
        content += `${kpi.label}: ${kpi.value}\n`;
      });
      content += '\n';
    }

    if (report.sections) {
      report.sections.forEach(section => {
        content += `=== ${section.title.toUpperCase()} ===\n`;
        content += `${section.content}\n\n`;
      });
    }

    if (report.insights) {
      content += '=== INSIGHTS ===\n';
      report.insights.forEach((insight, i) => {
        content += `${i + 1}. ${insight}\n`;
      });
    }

    // Download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{report.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Gerado em {(() => {
                  const date = parseDate(report.generatedAt);
                  return date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
                })()}
              </span>
              {report.period && (
                <>
                  <span>•</span>
                  <span>Período: {report.period.from} - {report.period.to}</span>
                </>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPIs */}
        {report.kpis && report.kpis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {report.kpis.map((kpi, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{kpi.value}</span>
                  {getTrendIcon(kpi.trend)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sections */}
        {report.sections && report.sections.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              {report.sections.map((section, i) => (
                <div key={i}>
                  <h4 className="font-semibold mb-2">{section.title}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Insights */}
        {report.insights && report.insights.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <h4 className="font-semibold">Insights da IA</h4>
              </div>
              <div className="space-y-2">
                {report.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Badge variant="secondary" className="mt-0.5">{i + 1}</Badge>
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
