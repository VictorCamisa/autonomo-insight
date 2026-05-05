import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Users, UserPlus, Trash2, History,
  ArrowUpDown, CheckCircle2, Zap, TrendingUp, Clock,
  Edit, AlertTriangle, Shield, Timer, ListOrdered, LayoutGrid,
  Bell, CalendarDays, Save, RotateCcw, Ban,
} from 'lucide-react';
import {
  useRoundRobinConfig, useSalespeopleWithRoles, useLeadAssignments,
  useAddToRoundRobin, useUpdateRoundRobinConfig, useRemoveFromRoundRobin,
} from '@/hooks/useRoundRobin';
import {
  useRoundRobinSettings, useUpdateRoundRobinSettings,
  useRoundRobinPenalties, useClearPenalty,
} from '@/hooks/useRoundRobinSettings';
import type { RoundRobinSettings } from '@/hooks/useRoundRobinSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEK_DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

export function RoundRobinPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [newPriority, setNewPriority] = useState(0);
  const [newDailyLimit, setNewDailyLimit] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [editDailyLimit, setEditDailyLimit] = useState('');

  const [localSettings, setLocalSettings] = useState<Partial<RoundRobinSettings>>({});
  const [settingsDirty, setSettingsDirty] = useState(false);

  const { data: roundRobinConfig, isLoading: loadingConfig } = useRoundRobinConfig();
  const { data: salespeople } = useSalespeopleWithRoles();
  const { data: assignments } = useLeadAssignments();
  const { data: settings, isLoading: loadingSettings } = useRoundRobinSettings();
  const { data: penalties } = useRoundRobinPenalties();

  const addToRoundRobin = useAddToRoundRobin();
  const updateConfig = useUpdateRoundRobinConfig();
  const removeFromRoundRobin = useRemoveFromRoundRobin();
  const updateSettings = useUpdateRoundRobinSettings();
  const clearPenalty = useClearPenalty();

  useEffect(() => {
    if (settings && !settingsDirty) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateLocal = (key: keyof RoundRobinSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync(localSettings);
    setSettingsDirty(false);
  };

  const handleResetSettings = () => {
    if (settings) {
      setLocalSettings(settings);
      setSettingsDirty(false);
    }
  };

  const vendedoresForaRR = salespeople?.filter(s => s.role === 'vendedor' && !s.is_in_round_robin) || [];
  const activeCount = roundRobinConfig?.filter(c => c.is_active).length || 0;
  const totalAssigned = roundRobinConfig?.reduce((sum, c) => sum + (c.total_leads_assigned || 0), 0) || 0;
  const todayAssigned = roundRobinConfig?.reduce((sum, c) => sum + (c.current_leads_today || 0), 0) || 0;
  const activePenalties = penalties?.filter(p => p.is_active) || [];

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addToRoundRobin.mutateAsync({
      salesperson_id: selectedUser.id,
      priority: newPriority,
      max_leads_per_day: newDailyLimit ? parseInt(newDailyLimit) : null,
    });
    setAddDialogOpen(false);
    setSelectedUser(null);
    setNewPriority(0);
    setNewDailyLimit('');
  };

  const handleEdit = async () => {
    if (!editingConfig) return;
    await updateConfig.mutateAsync({
      id: editingConfig.id,
      priority: editPriority,
      max_leads_per_day: editDailyLimit ? parseInt(editDailyLimit) : null,
    });
    setEditDialogOpen(false);
    setEditingConfig(null);
  };

  const openEdit = (config: any) => {
    setEditingConfig(config);
    setEditPriority(config.priority || 0);
    setEditDailyLimit(config.max_leads_per_day ? String(config.max_leads_per_day) : '');
    setEditDialogOpen(true);
  };

  const toggleWorkingDay = (day: number) => {
    const days = localSettings.working_days || [];
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    updateLocal('working_days', updated);
  };

  if (loadingConfig || loadingSettings) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando...</div>;
  }

  const s = localSettings;

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Round Robin</h2>
            <p className="text-muted-foreground text-sm">Distribuição automática de leads</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <span className="text-sm font-medium">Sistema</span>
            <Switch
              checked={s.is_globally_active ?? true}
              onCheckedChange={(v) => {
                updateLocal('is_globally_active', v);
                updateSettings.mutate({ is_globally_active: v });
              }}
            />
            <Badge variant={s.is_globally_active ? 'default' : 'secondary'} className="text-xs">
              {s.is_globally_active ? 'Ativo' : 'Pausado'}
            </Badge>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} disabled={vendedoresForaRR.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Vendedor
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Ativos', value: activeCount, icon: CheckCircle2 },
          { label: 'Total na Fila', value: roundRobinConfig?.length || 0, icon: Users },
          { label: 'Atribuídos Hoje', value: todayAssigned, icon: Zap },
          { label: 'Total Histórico', value: totalAssigned, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="fila">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="fila" className="gap-2"><ListOrdered className="h-4 w-4" />Fila</TabsTrigger>
          <TabsTrigger value="distribuicao" className="gap-2"><LayoutGrid className="h-4 w-4" />Distribuição</TabsTrigger>
          <TabsTrigger value="tempo" className="gap-2"><Timer className="h-4 w-4" />Tempo & Repasse</TabsTrigger>
          <TabsTrigger value="penalidades" className="gap-2">
            <Shield className="h-4 w-4" />Penalidades
            {activePenalties.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">{activePenalties.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-2"><CalendarDays className="h-4 w-4" />Horários</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2"><Bell className="h-4 w-4" />Notificações</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><History className="h-4 w-4" />Histórico</TabsTrigger>
        </TabsList>

        {/* FILA */}
        <TabsContent value="fila" className="mt-4 space-y-3">
          {roundRobinConfig && roundRobinConfig.length > 0 ? (
            roundRobinConfig
              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
              .map((config, index) => (
                <Card key={config.id} className={!config.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.is_active ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Users className={`h-5 w-5 ${config.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{config.salesperson?.full_name || 'Sem nome'}</p>
                          <Badge variant={config.is_active ? 'outline' : 'secondary'} className="text-xs">
                            {config.is_active ? 'Ativo' : 'Pausado'}
                          </Badge>
                          {(config.priority || 0) > 0 && (
                            <Badge variant="outline" className="text-xs">Prioridade {config.priority}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                          <span>Limite: {config.max_leads_per_day ? `${config.max_leads_per_day}/dia` : 'Sem limite'}</span>
                          <span>Hoje: {config.current_leads_today || 0}</span>
                          <span>Total: {config.total_leads_assigned || 0}</span>
                        </div>
                        {config.max_leads_per_day && (
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={Math.min(((config.current_leads_today || 0) / config.max_leads_per_day) * 100, 100)} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{config.current_leads_today || 0}/{config.max_leads_per_day}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={(checked) => updateConfig.mutate({ id: config.id, is_active: checked })}
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(config)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromRoundRobin.mutate(config.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Fila vazia</h3>
                <p className="text-muted-foreground mb-4">Adicione vendedores para iniciar a distribuição automática</p>
                <Button onClick={() => setAddDialogOpen(true)} disabled={vendedoresForaRR.length === 0}>
                  <UserPlus className="h-4 w-4 mr-2" />Adicionar Vendedor
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DISTRIBUIÇÃO */}
        <TabsContent value="distribuicao" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LayoutGrid className="h-5 w-5" />Método de Distribuição</CardTitle>
              <CardDescription>Define como os leads são alocados entre os vendedores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { value: 'sequential', label: 'Sequencial', desc: 'Distribui um por um em ordem de fila.', icon: ListOrdered },
                  { value: 'weighted', label: 'Ponderado', desc: 'Vendedores com maior peso recebem mais leads.', icon: ArrowUpDown },
                  { value: 'least_busy', label: 'Menos Ocupado', desc: 'Atribui ao vendedor com menos leads ativos.', icon: Zap },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => updateLocal('distribution_method', value as any)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      s.distribution_method === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${s.distribution_method === value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold">{label}</span>
                      {s.distribution_method === value && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleResetSettings} disabled={!settingsDirty}>
                  <RotateCcw className="h-4 w-4 mr-2" />Descartar
                </Button>
                <Button onClick={handleSaveSettings} disabled={!settingsDirty || updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" />{updateSettings.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPO & REPASSE */}
        <TabsContent value="tempo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" />Tempo de Resposta e Repasse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tempo limite de resposta (minutos)</Label>
                  <Input
                    type="number" min={1}
                    value={s.response_time_limit_minutes ?? 30}
                    onChange={e => updateLocal('response_time_limit_minutes', parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <Switch
                    checked={s.auto_reassign_enabled ?? true}
                    onCheckedChange={v => updateLocal('auto_reassign_enabled', v)}
                  />
                  <div>
                    <p className="text-sm font-medium">Repasse automático</p>
                    <p className="text-xs text-muted-foreground">Reatribui lead se não houver resposta no tempo limite</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleResetSettings} disabled={!settingsDirty}>
                  <RotateCcw className="h-4 w-4 mr-2" />Descartar
                </Button>
                <Button onClick={handleSaveSettings} disabled={!settingsDirty || updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" />Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PENALIDADES */}
        <TabsContent value="penalidades" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Configuração de Penalidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border">
                <Switch
                  checked={s.penalty_enabled ?? false}
                  onCheckedChange={v => updateLocal('penalty_enabled', v)}
                />
                <div>
                  <p className="text-sm font-medium">Penalidades habilitadas</p>
                  <p className="text-xs text-muted-foreground">Aplica penalidades a vendedores que não respondem a tempo</p>
                </div>
              </div>

              {s.penalty_enabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tipo de penalidade</Label>
                    <Select value={s.penalty_type ?? 'skip_turn'} onValueChange={v => updateLocal('penalty_type', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip_turn">Pular turno</SelectItem>
                        <SelectItem value="priority_reduction">Reduzir prioridade</SelectItem>
                        <SelectItem value="daily_limit_reduction">Reduzir limite diário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (horas)</Label>
                    <Input
                      type="number" min={1}
                      value={s.penalty_duration_hours ?? 24}
                      onChange={e => updateLocal('penalty_duration_hours', parseInt(e.target.value) || 24)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite antes de penalizar</Label>
                    <Input
                      type="number" min={1}
                      value={s.penalty_threshold ?? 3}
                      onChange={e => updateLocal('penalty_threshold', parseInt(e.target.value) || 3)}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleResetSettings} disabled={!settingsDirty}>
                  <RotateCcw className="h-4 w-4 mr-2" />Descartar
                </Button>
                <Button onClick={handleSaveSettings} disabled={!settingsDirty}>
                  <Save className="h-4 w-4 mr-2" />Salvar
                </Button>
              </div>
            </CardContent>
          </Card>

          {activePenalties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Penalidades Ativas ({activePenalties.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activePenalties.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="text-sm font-medium">{p.profile?.full_name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{p.reason || 'Não respondeu a tempo'}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => clearPenalty.mutate(p.id)}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HORÁRIOS */}
        <TabsContent value="horarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Horário de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border">
                <Switch
                  checked={s.working_hours_enabled ?? false}
                  onCheckedChange={v => updateLocal('working_hours_enabled', v)}
                />
                <div>
                  <p className="text-sm font-medium">Respeitar horário comercial</p>
                  <p className="text-xs text-muted-foreground">Leads fora do horário ficam em fila até o próximo dia útil</p>
                </div>
              </div>

              {s.working_hours_enabled && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Início</Label>
                      <Input type="time" value={s.working_hours_start ?? '08:00'} onChange={e => updateLocal('working_hours_start', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Input type="time" value={s.working_hours_end ?? '18:00'} onChange={e => updateLocal('working_hours_end', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de funcionamento</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map(d => (
                        <button
                          key={d.value}
                          onClick={() => toggleWorkingDay(d.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            (s.working_days || []).includes(d.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleResetSettings} disabled={!settingsDirty}>
                  <RotateCcw className="h-4 w-4 mr-2" />Descartar
                </Button>
                <Button onClick={handleSaveSettings} disabled={!settingsDirty}>
                  <Save className="h-4 w-4 mr-2" />Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICAÇÕES */}
        <TabsContent value="notificacoes" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notificações do Round Robin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Notificar vendedor ao receber lead</p>
                    <p className="text-xs text-muted-foreground">Envia notificação in-app e WhatsApp</p>
                  </div>
                  <Switch
                    checked={s.notify_salesperson_on_assign ?? true}
                    onCheckedChange={v => updateLocal('notify_salesperson_on_assign', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Notificar gerente sobre repasses</p>
                    <p className="text-xs text-muted-foreground">Alerta quando um lead é repassado automaticamente</p>
                  </div>
                  <Switch
                    checked={s.notify_manager_on_reassign ?? true}
                    onCheckedChange={v => updateLocal('notify_manager_on_reassign', v)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleResetSettings} disabled={!settingsDirty}>
                  <RotateCcw className="h-4 w-4 mr-2" />Descartar
                </Button>
                <Button onClick={handleSaveSettings} disabled={!settingsDirty}>
                  <Save className="h-4 w-4 mr-2" />Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="historico" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Últimas Atribuições</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-2">
                  {assignments.slice(0, 20).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{a.lead?.name || 'Lead sem nome'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.lead?.source || 'sem fonte'} • {a.lead?.phone || 'sem tel'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{a.salesperson?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.assigned_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atribuição registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vendedor ao Round Robin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select onValueChange={v => setSelectedUser(vendedoresForaRR.find(s => s.id === v))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {vendedoresForaRR.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || 'Sem nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Input type="number" value={newPriority} onChange={e => setNewPriority(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Limite diário (vazio = sem limite)</Label>
              <Input type="number" value={newDailyLimit} onChange={e => setNewDailyLimit(e.target.value)} placeholder="Sem limite" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!selectedUser || addToRoundRobin.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Input type="number" value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Limite diário</Label>
              <Input type="number" value={editDailyLimit} onChange={e => setEditDailyLimit(e.target.value)} placeholder="Sem limite" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={updateConfig.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
