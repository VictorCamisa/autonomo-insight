import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Users, UserCheck, UserX, Phone, Mail, MessageSquare, Calendar, ArrowRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads } from '@/hooks/useLeads';
import { useNegotiations, useCreateNegotiation } from '@/hooks/useNegotiations';
import { useCustomers } from '@/hooks/useCustomers';
import { LeadForm } from '@/components/crm/LeadForm';
import { LeadDetailSheet } from '@/components/crm/LeadDetailSheet';
import { NegotiationForm } from '@/components/crm/NegotiationForm';
import { leadSourceLabels } from '@/types/crm';
import type { Lead, LeadSource } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersWithRoles } from '@/hooks/useUsers';

interface UnifiedContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  created_at: string;
  updated_at: string;
  type: 'lead' | 'customer';
  isActive: boolean;
  activeNegotiationsCount: number;
  lastInteraction: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  leadId?: string;
  customerId?: string;
}

export function ContactsListView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreateNegotiationOpen, setIsCreateNegotiationOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UnifiedContact | null>(null);
  const [preSelectedLeadId, setPreSelectedLeadId] = useState<string | null>(null);

  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: negotiations } = useNegotiations();
  const { data: customers } = useCustomers();
  const { data: users } = useUsersWithRoles();
  const createNegotiation = useCreateNegotiation();
  const { user } = useAuth();

  // Consolidar leads e clientes em lista unificada
  const unifiedContacts = useMemo(() => {
    const contacts: UnifiedContact[] = [];
    const processedPhones = new Set<string>();

    // Processar leads
    leads?.forEach(lead => {
      const normalizedPhone = lead.phone.replace(/\D/g, '');
      if (processedPhones.has(normalizedPhone)) return;
      processedPhones.add(normalizedPhone);

      const leadNegotiations = negotiations?.filter(n => n.lead_id === lead.id) || [];
      const activeNegotiations = leadNegotiations.filter(n => 
        !['ganho', 'perdido'].includes(n.status)
      );

      const assignedUser = users?.find(u => u.id === lead.assigned_to);

      contacts.push({
        id: `lead-${lead.id}`,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        type: 'lead',
        isActive: activeNegotiations.length > 0,
        activeNegotiationsCount: activeNegotiations.length,
        lastInteraction: lead.updated_at,
        assignedTo: lead.assigned_to,
        assignedToName: assignedUser?.full_name || null,
        leadId: lead.id,
      });
    });

    // Processar clientes que não estão como leads
    customers?.forEach(customer => {
      const normalizedPhone = customer.phone.replace(/\D/g, '');
      if (processedPhones.has(normalizedPhone)) return;
      processedPhones.add(normalizedPhone);

      contacts.push({
        id: `customer-${customer.id}`,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        source: (customer.source as LeadSource) || 'outros',
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        type: 'customer',
        isActive: false,
        activeNegotiationsCount: 0,
        lastInteraction: customer.updated_at,
        assignedTo: null,
        assignedToName: null,
        customerId: customer.id,
      });
    });

    return contacts;
  }, [leads, negotiations, customers, users]);

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    return unifiedContacts.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && contact.isActive) ||
        (statusFilter === 'inactive' && !contact.isActive);

      const matchesSource = sourceFilter === 'all' || contact.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [unifiedContacts, searchTerm, statusFilter, sourceFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: unifiedContacts.length,
    active: unifiedContacts.filter(c => c.isActive).length,
    inactive: unifiedContacts.filter(c => !c.isActive).length,
  }), [unifiedContacts]);

  const handleStartNegotiation = (contact: UnifiedContact) => {
    if (contact.leadId) {
      setPreSelectedLeadId(contact.leadId);
      setIsCreateNegotiationOpen(true);
    }
  };

  const handleCreateNegotiation = async (data: Record<string, unknown>) => {
    await createNegotiation.mutateAsync({
      lead_id: (preSelectedLeadId || data.lead_id) as string,
      vehicle_id: data.vehicle_id as string | undefined,
      salesperson_id: data.salesperson_id as string,
      status: 'atendimento_ia',
      estimated_value: data.estimated_value ? Number(data.estimated_value) : undefined,
      notes: data.notes as string | undefined,
    });
    setIsCreateNegotiationOpen(false);
    setPreSelectedLeadId(null);
  };

  const isLoading = leadsLoading;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Contatos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSource | 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {Object.entries(leadSourceLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setIsCreateLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Última Interação</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{contact.name}</span>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          🟢 Ativo ({contact.activeNegotiationsCount})
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          ⚫ Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {leadSourceLabels[contact.source]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contact.assignedToName || (
                        <span className="text-muted-foreground text-sm">Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {contact.lastInteraction ? 
                          formatDistanceToNow(new Date(contact.lastInteraction), { addSuffix: true, locale: ptBR })
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {contact.leadId && !contact.isActive && (
                            <DropdownMenuItem onClick={() => handleStartNegotiation(contact)}>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Iniciar Negociação
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Novo Lead */}
      <Dialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          <LeadForm 
            onSubmit={() => setIsCreateLeadOpen(false)} 
            isLoading={false} 
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Negociação */}
      <Dialog open={isCreateNegotiationOpen} onOpenChange={setIsCreateNegotiationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
          </DialogHeader>
          <NegotiationForm 
            onSubmit={handleCreateNegotiation} 
            isLoading={createNegotiation.isPending} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
