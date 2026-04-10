import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserCircle, User2, Pencil, Trash2, Search, Filter, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads, useCreateLead } from '@/hooks/useLeads';
import { useNegotiations, useCreateNegotiation, useUpdateNegotiation, useDeleteNegotiation } from '@/hooks/useNegotiations';
import { LeadForm } from '@/components/crm/LeadForm';
import { LeadSearchDialog } from '@/components/crm/LeadSearchDialog';
import { LeadDetailSheet } from '@/components/crm/LeadDetailSheet';
import { NegotiationPipeline } from '@/components/crm/NegotiationPipeline';
import { NegotiationForm } from '@/components/crm/NegotiationForm';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';
import { QualificationLevelSelector } from '@/components/crm/QualificationLevelSelector';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead, LeadStatus, LeadSource } from '@/types/crm';
import type { Negotiation } from '@/types/negotiations';

export default function CRMHome() {
  const { role } = useAuth();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: negotiations = [], isLoading: negotiationsLoading } = useNegotiations();
  
  const createLead = useCreateLead();
  const createNegotiation = useCreateNegotiation();
  const updateNegotiation = useUpdateNegotiation();
  const deleteNegotiation = useDeleteNegotiation();
  
  const [searchLeadOpen, setSearchLeadOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  
  const [createNegotiationOpen, setCreateNegotiationOpen] = useState(false);
  const [editNegotiationOpen, setEditNegotiationOpen] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null);
  const [preSelectedLeadId, setPreSelectedLeadId] = useState<string | null>(null);
  const [preSelectedSalespersonId, setPreSelectedSalespersonId] = useState<string | null>(null);

  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Action choice dialog for negotiation click
  const [actionChoiceOpen, setActionChoiceOpen] = useState(false);
  const [pendingNegotiation, setPendingNegotiation] = useState<Negotiation | null>(null);
  
  // Delete confirmation dialog
  const [deleteNegotiationOpen, setDeleteNegotiationOpen] = useState(false);
  const [negotiationToDelete, setNegotiationToDelete] = useState<Negotiation | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<string>('all');

  const isManager = role === 'gerente';

  // Filter negotiations by search, period, and response
  const filteredNegotiations = useMemo(() => {
    let filtered = negotiations;

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      switch (periodFilter) {
        case '7d': cutoffDate = subDays(now, 7); break;
        case '14d': cutoffDate = subWeeks(now, 2); break;
        case '30d': cutoffDate = subMonths(now, 1); break;
        case '90d': cutoffDate = subMonths(now, 3); break;
        default: cutoffDate = new Date(0);
      }
      filtered = filtered.filter(neg => isAfter(new Date(neg.created_at), cutoffDate));
    }

    // Response filter
    if (responseFilter === 'sem_resposta') {
      // Leads where only the AI spoke (lead never responded — no salesperson interaction, qualification not advanced)
      filtered = filtered.filter(neg => {
        const lead = neg.lead;
        if (!lead) return false;
        // Lead sem first_response_at = nunca respondeu ao vendedor
        return !lead.first_response_at;
      });
    } else if (responseFilter === 'com_resposta') {
      filtered = filtered.filter(neg => neg.lead?.first_response_at);
    }

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((neg) => {
        const leadName = neg.lead?.name?.toLowerCase() || '';
        const leadPhone = neg.lead?.phone?.toLowerCase() || '';
        const vehicleInfo = neg.vehicle ? `${neg.vehicle.brand} ${neg.vehicle.model}`.toLowerCase() : '';
        const salespersonName = neg.salesperson?.full_name?.toLowerCase() || '';
        
        return (
          leadName.includes(query) ||
          leadPhone.includes(query) ||
          vehicleInfo.includes(query) ||
          salespersonName.includes(query)
        );
      });
    }

    return filtered;
  }, [negotiations, searchQuery, periodFilter, responseFilter]);

  const handleCreateLead = async (data: Record<string, unknown>) => {
    await createLead.mutateAsync({
      name: data.name as string,
      phone: data.phone as string,
      email: data.email as string | undefined,
      source: data.source as LeadSource,
      status: (data.status as LeadStatus) || 'novo',
      notes: data.notes as string | undefined,
      vehicle_interest: data.vehicle_interest as string | undefined,
      assigned_to: data.assigned_to as string,
    });
    setCreateLeadOpen(false);
  };

  const handleStartNegotiation = (leadId: string, salespersonId?: string) => {
    const lead = leads.find(l => l.id === leadId);
    setPreSelectedLeadId(leadId);
    setPreSelectedSalespersonId(salespersonId || lead?.assigned_to || null);
    setLeadDetailOpen(false);
    setCreateNegotiationOpen(true);
  };

  const handleCreateNegotiation = async (data: Record<string, unknown>) => {
    const vehicleId = data.vehicle_id as string | undefined;
    await createNegotiation.mutateAsync({
      lead_id: (preSelectedLeadId || data.lead_id) as string,
      vehicle_id: vehicleId && vehicleId !== '' ? vehicleId : undefined,
      salesperson_id: data.salesperson_id as string,
      status: data.status as NegotiationStatus,
      estimated_value: data.estimated_value ? Number(data.estimated_value) : undefined,
      probability: data.probability ? Number(data.probability) : undefined,
      expected_close_date: data.expected_close_date as string | undefined,
      notes: data.notes as string | undefined,
    });
    setCreateNegotiationOpen(false);
    setPreSelectedLeadId(null);
    setPreSelectedSalespersonId(null);
  };

  const handleUpdateNegotiation = async (data: Record<string, unknown>) => {
    if (!selectedNegotiation) return;
    const vehicleId = data.vehicle_id as string | undefined;
    const salespersonId = data.salesperson_id as string | undefined;
    const expectedCloseDate = data.expected_close_date as string | undefined;
    const appointmentDate = data.appointment_date as string | undefined;
    const appointmentTime = data.appointment_time as string | undefined;
    
    await updateNegotiation.mutateAsync({
      id: selectedNegotiation.id,
      salesperson_id: salespersonId && salespersonId !== '' ? salespersonId : null,
      vehicle_id: vehicleId && vehicleId !== '' ? vehicleId : null,
      status: data.status as NegotiationStatus,
      estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
      probability: data.probability ? Number(data.probability) : null,
      expected_close_date: expectedCloseDate && expectedCloseDate !== '' ? expectedCloseDate : null,
      appointment_date: appointmentDate && appointmentDate !== '' ? appointmentDate : null,
      appointment_time: appointmentTime && appointmentTime !== '' ? appointmentTime : null,
      showed_up: data.showed_up as boolean | undefined,
      loss_reason: data.loss_reason as string | undefined || null,
      structured_loss_reason: data.structured_loss_reason as 'sem_entrada' | 'sem_credito' | 'curioso' | 'caro' | 'comprou_outro' | 'desistiu' | 'sem_contato' | 'veiculo_vendido' | 'outros' | undefined,
      notes: data.notes as string | undefined || null,
      objections: data.objections as string[] | undefined,
    });
    setEditNegotiationOpen(false);
    setSelectedNegotiation(null);
  };

  const handleNegotiationClick = (negotiation: Negotiation) => {
    setPendingNegotiation(negotiation);
    setActionChoiceOpen(true);
  };

  const handleChooseViewLead = () => {
    if (pendingNegotiation?.lead) {
      const lead = leads.find(l => l.id === pendingNegotiation.lead_id);
      if (lead) {
        setSelectedLead(lead);
        setLeadDetailOpen(true);
      }
    }
    setActionChoiceOpen(false);
    setPendingNegotiation(null);
  };

  const handleChooseEditNegotiation = () => {
    if (pendingNegotiation) {
      setSelectedNegotiation(pendingNegotiation);
      setEditNegotiationOpen(true);
    }
    setActionChoiceOpen(false);
    setPendingNegotiation(null);
  };

  const handleViewCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCustomerDetailOpen(true);
  };

  const isLoading = leadsLoading || negotiationsLoading;

  return (
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead, veículo ou vendedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[170px]">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="14d">Últimas 2 semanas</SelectItem>
            <SelectItem value="30d">Último mês</SelectItem>
            <SelectItem value="90d">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={responseFilter} onValueChange={setResponseFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Resposta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os leads</SelectItem>
            <SelectItem value="sem_resposta">Sem resposta</SelectItem>
            <SelectItem value="com_resposta">Com resposta</SelectItem>
          </SelectContent>
        </Select>

        {(periodFilter !== 'all' || responseFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setPeriodFilter('all'); setResponseFilter('all'); }}>
            Limpar filtros
          </Button>
        )}

        <QualificationLevelSelector />
      </div>

      {/* Active filters summary */}
      {(periodFilter !== 'all' || responseFilter !== 'all' || searchQuery) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando {filteredNegotiations.length} de {negotiations.length} negociações</span>
          {periodFilter !== 'all' && (
            <Badge variant="secondary">
              {periodFilter === '7d' ? '7 dias' : periodFilter === '14d' ? '2 semanas' : periodFilter === '30d' ? '1 mês' : '3 meses'}
            </Badge>
          )}
          {responseFilter !== 'all' && (
            <Badge variant="secondary">
              {responseFilter === 'sem_resposta' ? 'Sem resposta' : 'Com resposta'}
            </Badge>
          )}
        </div>
      )}

      {/* Pipeline */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 shrink-0">
              <Skeleton className="h-16 mb-2 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 mt-2 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <NegotiationPipeline 
            negotiations={filteredNegotiations}
            onNegotiationClick={handleNegotiationClick}
            onCreateNegotiation={() => setCreateNegotiationOpen(true)}
            onCreateLead={() => setSearchLeadOpen(true)}
            showSalesperson={isManager}
          />
        </div>
      )}

      {/* Lead Search Dialog */}
      <LeadSearchDialog
        open={searchLeadOpen}
        onOpenChange={setSearchLeadOpen}
        onCreateNew={() => setCreateLeadOpen(true)}
      />

      {/* Create Lead Dialog */}
      <Dialog open={createLeadOpen} onOpenChange={setCreateLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <LeadForm onSubmit={handleCreateLead} isLoading={createLead.isPending} />
        </DialogContent>
      </Dialog>

      <LeadDetailSheet
        lead={selectedLead}
        open={leadDetailOpen}
        onOpenChange={setLeadDetailOpen}
        onStartNegotiation={handleStartNegotiation}
      />

      <Dialog open={createNegotiationOpen} onOpenChange={(open) => {
        setCreateNegotiationOpen(open);
        if (!open) {
          setPreSelectedLeadId(null);
          setPreSelectedSalespersonId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
          </DialogHeader>
          <NegotiationForm 
            onSubmit={handleCreateNegotiation} 
            isLoading={createNegotiation.isPending}
            onCreateLead={() => {
              setCreateNegotiationOpen(false);
              setCreateLeadOpen(true);
            }}
            negotiation={preSelectedLeadId ? { 
              lead_id: preSelectedLeadId,
              salesperson_id: preSelectedSalespersonId || ''
            } as Negotiation : undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editNegotiationOpen} onOpenChange={setEditNegotiationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Negociação</DialogTitle>
          </DialogHeader>
          {selectedNegotiation && (
            <>
              <NegotiationForm 
                negotiation={selectedNegotiation}
                onSubmit={handleUpdateNegotiation} 
                isLoading={updateNegotiation.isPending}
              />
              <div className="flex gap-2 mt-2">
                {selectedNegotiation.customer_id && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setEditNegotiationOpen(false);
                      handleViewCustomer(selectedNegotiation.customer_id!);
                    }}
                  >
                    <UserCircle className="h-4 w-4 mr-2" />
                    Ver Cliente
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  className={selectedNegotiation.customer_id ? '' : 'w-full'}
                  onClick={() => {
                    setNegotiationToDelete(selectedNegotiation);
                    setDeleteNegotiationOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Negociação
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Choice Dialog */}
      <Dialog open={actionChoiceOpen} onOpenChange={setActionChoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O que deseja fazer?</DialogTitle>
            <DialogDescription>
              Escolha uma ação para a negociação de <span className="font-semibold">{pendingNegotiation?.lead?.name || 'Lead'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="outline"
              className="justify-start h-14 text-left"
              onClick={handleChooseViewLead}
            >
              <User2 className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Ver Ficha do Lead</div>
                <div className="text-xs text-muted-foreground">WhatsApp, histórico e informações</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-14 text-left"
              onClick={handleChooseEditNegotiation}
            >
              <Pencil className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Editar Negociação</div>
                <div className="text-xs text-muted-foreground">Status, valor, previsão e objeções</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-14 text-left text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setNegotiationToDelete(pendingNegotiation);
                setActionChoiceOpen(false);
                setDeleteNegotiationOpen(true);
              }}
            >
              <Trash2 className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Excluir Negociação</div>
                <div className="text-xs text-muted-foreground">Remover permanentemente</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteNegotiationOpen} onOpenChange={setDeleteNegotiationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Negociação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a negociação de <span className="font-semibold">{negotiationToDelete?.lead?.name || 'Lead'}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNegotiationToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (negotiationToDelete) {
                  await deleteNegotiation.mutateAsync(negotiationToDelete.id);
                  setDeleteNegotiationOpen(false);
                  setEditNegotiationOpen(false);
                  setNegotiationToDelete(null);
                  setSelectedNegotiation(null);
                }
              }}
            >
              {deleteNegotiation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerDetailSheet
        customerId={selectedCustomerId}
        open={customerDetailOpen}
        onOpenChange={setCustomerDetailOpen}
      />
    </div>
  );
}
