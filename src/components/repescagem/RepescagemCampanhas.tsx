import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Settings, Loader2, Sparkles } from 'lucide-react';

interface Row {
  agent_id: string;
  agent_name: string;
  campaign_id: string | null;
  is_active: boolean;
  attempts_count: number;
}

export default function RepescagemCampanhas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: agents } = await supabase
        .from('ai_agents')
        .select('id, name, display_name')
        .order('name');
      const { data: campaigns } = await supabase
        .from('follow_up_campaigns')
        .select('id, agent_id, is_active, attempts');

      const map = new Map((campaigns || []).map((c: any) => [c.agent_id, c]));
      const out: Row[] = (agents || []).map((a: any) => {
        const c: any = map.get(a.id);
        return {
          agent_id: a.id,
          agent_name: a.display_name || a.name,
          campaign_id: c?.id ?? null,
          is_active: c?.is_active ?? false,
          attempts_count: Array.isArray(c?.attempts) ? c.attempts.length : 0,
        };
      });
      setRows(out);
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
        <h2 className="text-2xl font-bold">Campanhas por Agente</h2>
        <p className="text-muted-foreground">Cada agente IA pode ter sua própria campanha de repescagem.</p>
      </div>

      {rows.length === 0 && (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Nenhum agente IA cadastrado ainda.</CardContent></Card>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.agent_id}>
            <CardContent className="pt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.agent_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.campaign_id ? `${r.attempts_count} tentativa(s) configurada(s)` : 'Sem campanha configurada'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.campaign_id ? (
                  <Badge variant={r.is_active ? 'default' : 'secondary'} className="gap-1">
                    {r.is_active && <Sparkles className="h-3 w-3" />}
                    {r.is_active ? 'Ativa' : 'Pausada'}
                  </Badge>
                ) : (
                  <Badge variant="outline">Não configurada</Badge>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to={`/ai-agents/${r.agent_id}/repescagem`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
