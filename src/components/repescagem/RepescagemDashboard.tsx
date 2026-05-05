import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Send, MessageCircleReply, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';

interface Stats {
  activeCampaigns: number;
  totalCampaigns: number;
  scheduled: number;
  sentToday: number;
  sent7d: number;
  failed7d: number;
  responded7d: number;
}

export default function RepescagemDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

      const [campaigns, scheduled, today, week, failed] = await Promise.all([
        supabase.from('follow_up_campaigns').select('id,is_active'),
        supabase.from('follow_up_attempts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('follow_up_attempts').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', startOfDay.toISOString()),
        supabase.from('follow_up_attempts').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', sevenDaysAgo.toISOString()),
        supabase.from('follow_up_attempts').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      setStats({
        activeCampaigns: campaigns.data?.filter((c: any) => c.is_active).length ?? 0,
        totalCampaigns: campaigns.data?.length ?? 0,
        scheduled: scheduled.count ?? 0,
        sentToday: today.count ?? 0,
        sent7d: week.count ?? 0,
        failed7d: failed.count ?? 0,
        responded7d: 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    { label: 'Campanhas ativas', value: `${stats.activeCampaigns}/${stats.totalCampaigns}`, icon: Sparkles, color: 'text-primary' },
    { label: 'Agendadas (pendentes)', value: stats.scheduled, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Enviadas hoje', value: stats.sentToday, icon: Send, color: 'text-green-500' },
    { label: 'Enviadas (7 dias)', value: stats.sent7d, icon: MessageCircleReply, color: 'text-emerald-500' },
    { label: 'Falhas (7 dias)', value: stats.failed7d, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Visão Geral
        </h2>
        <p className="text-muted-foreground">Métricas de desempenho do sistema de repescagem automática.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
          <CardDescription>O cron roda a cada 15 minutos verificando leads inativos.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. A cada agente você define uma <strong>campanha</strong> com sequência de tentativas.</p>
          <p>2. Quando um lead fica inativo pelo tempo configurado, a IA gera uma mensagem contextual e envia via WhatsApp.</p>
          <p>3. Se o lead responder, a sequência é interrompida automaticamente.</p>
          <p>4. Esgotadas todas as tentativas, a ação configurada é executada (notificar vendedor, marcar perdido, etc).</p>
        </CardContent>
      </Card>
    </div>
  );
}
