import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Attempt {
  id: string;
  attempt_number: number;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  message_content: string | null;
  error_message: string | null;
  lead_id: string | null;
  leads?: { name: string | null; phone: string | null } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Agendada', color: 'bg-blue-500/10 text-blue-600', icon: Clock },
  sent: { label: 'Enviada', color: 'bg-green-500/10 text-green-600', icon: Send },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
  responded: { label: 'Respondida', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
};

export default function RepescagemHistorico() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('follow_up_attempts')
        .select('id, attempt_number, status, scheduled_for, sent_at, message_content, error_message, lead_id, leads(name, phone)')
        .order('created_at', { ascending: false })
        .limit(100);
      setAttempts((data as any) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Histórico</h2>
        <p className="text-muted-foreground">Últimas 100 tentativas de repescagem disparadas pelo sistema.</p>
      </div>

      {attempts.length === 0 && (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Nenhuma tentativa registrada ainda.</CardContent></Card>
      )}

      <div className="space-y-2">
        {attempts.map((a) => {
          const cfg = statusConfig[a.status] ?? statusConfig.pending;
          const Icon = cfg.icon;
          const date = a.sent_at ?? a.scheduled_for;
          return (
            <Card key={a.id}>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={`${cfg.color} gap-1 border-0`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                    <Badge variant="outline">Tentativa {a.attempt_number}</Badge>
                    <span className="text-sm font-medium truncate">
                      {a.leads?.name || a.leads?.phone || 'Lead removido'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(new Date(date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {a.message_content && (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded p-2 line-clamp-2">{a.message_content}</p>
                )}
                {a.error_message && (
                  <p className="text-xs text-destructive">{a.error_message}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
