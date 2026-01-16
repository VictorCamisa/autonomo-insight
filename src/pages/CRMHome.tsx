import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserCircle, User2, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads, useCreateLead } from '@/hooks/useLeads';
import { useNegotiations, useCreateNegotiation, useUpdateNegotiation, useDeleteNegotiation } from '@/hooks/useNegotiations';
import { LeadForm } from '@/components/crm/LeadForm';
import { LeadDetailSheet } from '@/components/crm/LeadDetailSheet';
import { NegotiationPipeline } from '@/components/crm/NegotiationPipeline';
import { NegotiationForm } from '@/components/crm/NegotiationForm';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = role === 'gerente';

  // Filter negotiations by search
  const filteredNegotiations = useMemo(() => {
    if (!searchQuery.trim()) return negotiations;
    
    const query = searchQuery.toLowerCase();
    return negotiations.filter((neg) => {
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
  }, [negotiations, searchQuery]);

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
      status: data.status as 'em_andamento' | 'proposta_enviada' | 'negociando' | 'ganho' | 'perdido' | 'pausado',
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
    await updateNegotiation.mutateAsync({
      id: selectedNegotiation.id,
      vehicle_id: vehicleId && vehicleId !== '' ? vehicleId : null,
      status: data.status as 'em_andamento' | 'proposta_enviada' | 'negociando' | 'ganho' | 'perdido' | 'pausado',
      estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
      probability: data.probability ? Number(data.probability) : null,
      expected_close_date: data.expected_close_date as string | undefined,
      loss_reason: data.loss_reason as string | undefined,
      notes: data.notes as string | undefined,
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
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por lead, veículo ou vendedor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

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
            onCreateLead={() => setCreateLeadOpen(true)}
            showSalesperson={isManager}
          />
        </div>
      )}

      {/* Dialogs */}
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
