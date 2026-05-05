import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Row {
  id: string;
  lead_id: string | null;
  attempt_number: number;
  scheduled_for: string;
  leads?: { name: string | null; phone: string | null } | null;
}

export default function RepescagemLeads() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('follow_up_attempts')
        .select('id, lead_id, attempt_number, scheduled_for, leads(name, phone)')
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(200);
      setRows((data as any) || []);
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
        <h2 className="text-2xl font-bold">Leads em Repescagem</h2>
        <p className="text-muted-foreground">Leads aguardando próxima tentativa automática da IA.</p>
      </div>

      {rows.length === 0 && (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Nenhum lead aguardando repescagem no momento.</CardContent></Card>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const due = new Date(r.scheduled_for);
          const overdue = due.getTime() < Date.now();
          return (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline">Tentativa {r.attempt_number}</Badge>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.leads?.name || 'Sem nome'}</div>
                    <div className="text-xs text-muted-foreground">{r.leads?.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`text-xs flex items-center gap-1 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" />
                    {overdue ? 'Pronto para envio' : `em ${formatDistanceToNow(due, { locale: ptBR })}`}
                  </div>
                  {r.lead_id && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/crm`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
