import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  RefreshCw, 
  UserPlus, 
  Settings, 
  History,
  Target,
  Phone,
  MessageCircle,
  Award,
  Trash2,
  Edit,
  Check,
  X
} from 'lucide-react';
import { 
  useRoundRobinConfig, 
  useSalespeopleWithRoles, 
  useLeadAssignments,
  useAddToRoundRobin,
  useUpdateRoundRobinConfig,
  useRemoveFromRoundRobin,
  useAssignSalespersonRole,
  useCreateUser
} from '@/hooks/useRoundRobin';
import { useSalesTeamMetrics } from '@/hooks/useSalesTeamMetrics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  marketing: 'Marketing',
};

export function SalesTeamView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('equipe');
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newPriority, setNewPriority] = useState(0);
  const [newMaxLeads, setNewMaxLeads] = useState<string>('');
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('vendedor');
  const [addToRoundRobinOnCreate, setAddToRoundRobinOnCreate] = useState(true);

  const { data: roundRobinConfig } = useRoundRobinConfig();
  const { data: salespeople, isLoading } = useSalespeopleWithRoles();
  const { data: assignments } = useLeadAssignments();
  const { data: teamMetrics } = useSalesTeamMetrics();

  const addToRoundRobin = useAddToRoundRobin();
  const updateConfig = useUpdateRoundRobinConfig();
  const removeFromRoundRobin = useRemoveFromRoundRobin();
  const assignRole = useAssignSalespersonRole();
  const createUser = useCreateUser();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const vendedores = salespeople?.filter(s => s.role === 'vendedor') || [];
  const activeInRoundRobin = roundRobinConfig?.filter(c => c.is_active) || [];

  const handleAddToRoundRobin = async (salespersonId: string) => {
    await addToRoundRobin.mutateAsync({
      salesperson_id: salespersonId,
      priority: newPriority,
      max_leads_per_day: newMaxLeads ? parseInt(newMaxLeads) : null,
    });
    setAddDialogOpen(false);
    setSelectedUser(null);
    setNewPriority(0);
    setNewMaxLeads('');
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !newRole) return;
    await assignRole.mutateAsync({
      user_id: selectedUser.id,
      role: newRole as 'vendedor' | 'gerente' | 'marketing',
    });
    setRoleDialogOpen(false);
    setSelectedUser(null);
    setNewRole('');
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName || !newUserRole) return;
    await createUser.mutateAsync({
      email: newUserEmail,
      password: newUserPassword,
      full_name: newUserName,
      role: newUserRole as 'vendedor' | 'gerente' | 'marketing',
      add_to_round_robin: addToRoundRobinOnCreate && newUserRole === 'vendedor',
    });
    setCreateUserDialogOpen(false);
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserRole('vendedor');
    setAddToRoundRobinOnCreate(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestão da Equipe
          </h2>
          <p className="text-muted-foreground">
            Gerencie vendedores e configure a distribuição de leads
          </p>
        </div>
        <Button onClick={() => setCreateUserDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Vendedor
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipe" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendedores
          </TabsTrigger>
          <TabsTrigger value="roundrobin" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Round Robin
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Atribuições
          </TabsTrigger>
        </TabsList>

        {/* Tab: Vendedores */}
        <TabsContent value="equipe" className="mt-4 space-y-4">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Usuários</p>
                <p className="text-2xl font-bold">{salespeople?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Vendedores</p>
                <p className="text-2xl font-bold">{vendedores.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">No Round Robin</p>
                <p className="text-2xl font-bold">{activeInRoundRobin.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Leads Atribuídos Hoje</p>
                <p className="text-2xl font-bold">
                  {roundRobinConfig?.reduce((sum, c) => sum + c.current_leads_today, 0) || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Salespeople List */}
          <Card>
            <CardHeader>
              <CardTitle>Todos os Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salespeople?.map((person) => {
                  const metrics = teamMetrics?.find(m => m.user_id === person.id);
                  
                  return (
                    <div 
                      key={person.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/vendas/equipe/${person.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{person.full_name || 'Sem nome'}</p>
                          <div className="flex items-center gap-2">
                            {person.role ? (
                              <Badge variant="outline">{roleLabels[person.role] || person.role}</Badge>
                            ) : (
                              <Badge variant="secondary">Sem função</Badge>
                            )}
                            {person.is_in_round_robin && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                <RefreshCw className="h-3 w-3 mr-1" /> Round Robin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {metrics && (
                          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                            <span><Target className="h-4 w-4 inline mr-1" />{metrics.total_negotiations}</span>
                            <span><Phone className="h-4 w-4 inline mr-1" />{metrics.calls_count}</span>
                            <span><MessageCircle className="h-4 w-4 inline mr-1" />{metrics.whatsapp_count}</span>
                            <span className="font-medium text-foreground">{formatCurrency(metrics.total_revenue)}</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(person);
                              setNewRole(person.role || '');
                              setRoleDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Função
                          </Button>
                          {person.role === 'vendedor' && !person.is_in_round_robin && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(person);
                                setAddDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add Round Robin
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!salespeople || salespeople.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário cadastrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Round Robin */}
        <TabsContent value="roundrobin" className="mt-4 space-y-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <RefreshCw className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Sistema Round Robin</h3>
                  <p className="text-muted-foreground">
                    Distribui leads automaticamente entre os vendedores de forma equilibrada
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {roundRobinConfig && roundRobinConfig.length > 0 ? (
            <div className="space-y-3">
              {roundRobinConfig.map((config) => (
                <Card key={config.id} className={!config.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          config.is_active ? 'bg-green-500/20' : 'bg-muted'
                        }`}>
                          <Users className={`h-5 w-5 ${config.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{config.salesperson?.full_name || 'Sem nome'}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>Prioridade: {config.priority}</span>
                            <span>•</span>
                            <span>Limite: {config.max_leads_per_day || 'Sem limite'}</span>
                            <span>•</span>
                            <span>Hoje: {config.current_leads_today}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{config.total_leads_assigned}</p>
                          <p className="text-xs text-muted-foreground">total atribuídos</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.is_active}
                            onCheckedChange={(checked) => 
                              updateConfig.mutate({ id: config.id, is_active: checked })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => removeFromRoundRobin.mutate(config.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {config.max_leads_per_day && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progresso diário</span>
                          <span>{config.current_leads_today} / {config.max_leads_per_day}</span>
                        </div>
                        <Progress 
                          value={(config.current_leads_today / config.max_leads_per_day) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhum vendedor no Round Robin</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione vendedores para começar a distribuição automática de leads
                </p>
                <Button onClick={() => setActiveTab('equipe')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Gerenciar Vendedores
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Histórico de Atribuições */}
        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Atribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div 
                      key={assignment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{assignment.lead?.name || 'Lead removido'}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.lead?.phone} • {assignment.lead?.source}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{assignment.salesperson?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const date = parseDate(assignment.assigned_at);
                              return date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
                            })()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {assignment.assignment_type === 'round_robin' ? 'Automático' : 'Manual'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atribuição registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Add to Round Robin */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ao Round Robin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Adicionando <strong>{selectedUser?.full_name}</strong> ao sistema de distribuição automática de leads.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Input
                type="number"
                value={newPriority}
                onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                placeholder="0 = normal, valores maiores = maior prioridade"
              />
              <p className="text-xs text-muted-foreground">
                Vendedores com maior prioridade recebem leads primeiro
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Limite de leads por dia</label>
              <Input
                type="number"
                value={newMaxLeads}
                onChange={(e) => setNewMaxLeads(e.target.value)}
                placeholder="Deixe vazio para sem limite"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedUser && handleAddToRoundRobin(selectedUser.id)}
              disabled={addToRoundRobin.isPending}
            >
              {addToRoundRobin.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Assign Role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Função</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Definir função para <strong>{selectedUser?.full_name}</strong>
            </p>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignRole}
              disabled={!newRole || assignRole.isPending}
            >
              {assignRole.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create New User */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Novo Vendedor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo *</label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome do vendedor"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail *</label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha *</label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Função</label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserRole === 'vendedor' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Adicionar ao Round Robin</p>
                  <p className="text-xs text-muted-foreground">
                    Incluir na distribuição automática de leads
                  </p>
                </div>
                <Switch
                  checked={addToRoundRobinOnCreate}
                  onCheckedChange={setAddToRoundRobinOnCreate}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={!newUserEmail || !newUserPassword || !newUserName || createUser.isPending}
            >
              {createUser.isPending ? 'Criando...' : 'Criar Vendedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
