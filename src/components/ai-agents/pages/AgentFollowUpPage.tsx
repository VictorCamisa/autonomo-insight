import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Sparkles, MessageSquare, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';

interface AttemptDef {
  delay_hours: number;
  hint: string;
}

interface Campaign {
  id?: string;
  agent_id: string | null;
  name: string;
  is_active: boolean;
  attempts: AttemptDef[];
  on_exhausted: 'notify_seller' | 'mark_lost' | 'mark_only';
  apply_to_statuses: string[];
}

const DEFAULTS: AttemptDef[] = [
  { delay_hours: 24, hint: 'Tom leve. Lembrar do interesse no veículo. Perguntar se ainda faz sentido conversar.' },
  { delay_hours: 48, hint: 'Reabrir conversa de outro ângulo. Mencionar facilidade de financiamento ou avaliação de troca.' },
  { delay_hours: 72, hint: 'Última tentativa. Tom respeitoso, deixar porta aberta para retornar quando quiser.' },
];

export default function AgentFollowUpPage() {
  const { agentId } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('follow_up_campaigns')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (data) {
        setCampaign({
          ...data,
          attempts: (data.attempts as any) || [],
          apply_to_statuses: data.apply_to_statuses || ['atendimento_ia', 'negociando'],
        } as Campaign);
      } else {
        setCampaign({
          agent_id: agentId,
          name: 'Repescagem padrão',
          is_active: false,
          attempts: DEFAULTS,
          on_exhausted: 'notify_seller',
          apply_to_statuses: ['atendimento_ia', 'negociando'],
        });
      }
      setLoading(false);
    })();
  }, [agentId]);

  const persist = useDebouncedCallback(async (c: Campaign) => {
    setSaveState('saving');
    try {
      if (c.id) {
        const { error } = await supabase
          .from('follow_up_campaigns')
          .update({
            name: c.name,
            is_active: c.is_active,
            attempts: c.attempts as any,
            on_exhausted: c.on_exhausted,
            apply_to_statuses: c.apply_to_statuses,
          })
          .eq('id', c.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('follow_up_campaigns')
          .insert({
            agent_id: c.agent_id,
            name: c.name,
            is_active: c.is_active,
            attempts: c.attempts as any,
            on_exhausted: c.on_exhausted,
            apply_to_statuses: c.apply_to_statuses,
          })
          .select()
          .single();
        if (error) throw error;
        setCampaign((prev) => (prev ? { ...prev, id: data.id } : prev));
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e: any) {
      setSaveState('idle');
      toast.error('Erro ao salvar: ' + e.message);
    }
  }, 600);

  const update = (patch: Partial<Campaign>) => {
    if (!campaign) return;
    const next = { ...campaign, ...patch };
    setCampaign(next);
    persist(next);
  };

  const updateAttempt = (idx: number, patch: Partial<AttemptDef>) => {
    if (!campaign) return;
    const attempts = campaign.attempts.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    update({ attempts });
  };

  const totalWindow = useMemo(
    () => campaign?.attempts.reduce((sum, a) => sum + (a.delay_hours || 0), 0) ?? 0,
    [campaign]
  );

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Repescagem automática
          </h1>
          <p className="text-muted-foreground mt-1">
            A IA reaviva conversas paradas com mensagens contextualizadas. Ative, configure e está pronto.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-[100px] justify-end">
          {saveState === 'saving' && (<><Loader2 className="h-3 w-3 animate-spin" /> salvando…</>)}
          {saveState === 'saved' && (<><Check className="h-3 w-3 text-green-500" /> salvo</>)}
        </div>
      </div>

      {/* Toggle principal */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">Repescagem ativa</Label>
            <p className="text-sm text-muted-foreground">
              {campaign.is_active
                ? `Rodando — ${campaign.attempts.length} tentativa(s) ao longo de ${totalWindow}h.`
                : 'Desligada. Nenhum lead será contatado automaticamente.'}
            </p>
          </div>
          <Switch
            checked={campaign.is_active}
            onCheckedChange={(v) => update({ is_active: v })}
          />
        </CardContent>
      </Card>

      {/* Tentativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sequência de tentativas
          </CardTitle>
          <CardDescription>
            Cada tentativa espera o tempo definido após a <strong>última mensagem enviada</strong> e usa a dica para guiar o tom da IA.
            A contagem reinicia se o lead responder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.attempts.map((att, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card/50">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Tentativa {idx + 1}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update({ attempts: campaign.attempts.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
                <div>
                  <Label className="text-xs text-muted-foreground">Esperar (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={att.delay_hours}
                    onChange={(e) => updateAttempt(idx, { delay_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dica de abordagem para a IA</Label>
                  <Textarea
                    rows={2}
                    placeholder="Ex: Tom leve, lembrar do veículo, perguntar se ainda faz sentido."
                    value={att.hint}
                    onChange={(e) => updateAttempt(idx, { hint: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              update({
                attempts: [...campaign.attempts, { delay_hours: 24, hint: '' }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar tentativa
          </Button>
        </CardContent>
      </Card>

      {/* Após esgotar */}
      <Card>
        <CardHeader>
          <CardTitle>Quando acabarem todas as tentativas</CardTitle>
          <CardDescription>O que fazer com o lead se ele não responder a nenhuma mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={campaign.on_exhausted}
            onValueChange={(v: any) => update({ on_exhausted: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="notify_seller">Marcar e notificar o vendedor</SelectItem>
              <SelectItem value="mark_only">Apenas marcar (sem notificação)</SelectItem>
              <SelectItem value="mark_lost">Mover automaticamente para Perdido</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Aplicar a quais estágios */}
      <Card>
        <CardHeader>
          <CardTitle>Aplicar em quais estágios</CardTitle>
          <CardDescription>A repescagem só age sobre leads nestes estágios.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {[
            { v: 'atendimento_ia', l: 'Atendimento IA' },
            { v: 'negociando', l: 'Negociando' },
          ].map((s) => {
            const active = campaign.apply_to_statuses.includes(s.v);
            return (
              <Badge
                key={s.v}
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer text-sm py-1.5 px-3"
                onClick={() => {
                  const next = active
                    ? campaign.apply_to_statuses.filter((x) => x !== s.v)
                    : [...campaign.apply_to_statuses, s.v];
                  update({ apply_to_statuses: next });
                }}
              >
                {active && <Check className="h-3 w-3 mr-1" />}
                {s.l}
              </Badge>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
