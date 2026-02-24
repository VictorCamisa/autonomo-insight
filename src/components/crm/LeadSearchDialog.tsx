import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, UserCheck, Phone, Mail } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useNegotiations, useCreateNegotiation } from '@/hooks/useNegotiations';
import { useUpdateLead } from '@/hooks/useLeads';
import { leadStatusLabels, leadStatusColors, leadSourceLabels } from '@/types/crm';
import type { Lead } from '@/types/crm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface LeadSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNew: () => void;
  onLeadReactivated?: (leadId: string) => void;
}

export function LeadSearchDialog({ open, onOpenChange, onCreateNew, onLeadReactivated }: LeadSearchDialogProps) {
  const [search, setSearch] = useState('');
  const { data: leads = [] } = useLeads();
  const { data: negotiations = [] } = useNegotiations();
  const createNegotiation = useCreateNegotiation();
  const updateLead = useUpdateLead();

  const activeLeadIds = useMemo(() => {
    return new Set(
      negotiations
        .filter(n => !['ganho', 'perdido'].includes(n.status))
        .map(n => n.lead_id)
    );
  }, [negotiations]);

  const filteredLeads = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return [];
    const q = search.toLowerCase();
    return leads.filter(lead => {
      return (
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q)
      );
    }).slice(0, 15);
  }, [leads, search]);

  const handleReactivate = async (lead: Lead) => {
    try {
      // Reactivate lead status if needed
      if (lead.status === 'perdido' || lead.status === 'convertido') {
        await updateLead.mutateAsync({ id: lead.id, status: 'novo' });
      }

      // Check if already has active negotiation
      if (activeLeadIds.has(lead.id)) {
        toast.info(`${lead.name} já possui negociação ativa no pipeline.`);
        onOpenChange(false);
        setSearch('');
        return;
      }

      // Create new negotiation for this lead
      await createNegotiation.mutateAsync({
        lead_id: lead.id,
        salesperson_id: lead.assigned_to || '',
        status: 'atendimento_ia',
      });

      toast.success(`Lead "${lead.name}" reativado com nova negociação!`);
      onLeadReactivated?.(lead.id);
      onOpenChange(false);
      setSearch('');
    } catch (error: any) {
      toast.error(`Erro ao reativar lead: ${error.message}`);
    }
  };

  const handleCreateNew = () => {
    onOpenChange(false);
    setSearch('');
    onCreateNew();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(''); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead / Reativar Existente</DialogTitle>
          <DialogDescription>
            Busque por nome, telefone ou email para verificar se o lead já existe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Results */}
          {search.trim().length >= 2 && (
            <ScrollArea className="max-h-[320px]">
              <div className="space-y-2">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const hasActiveNeg = activeLeadIds.has(lead.id);
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{lead.name}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${leadStatusColors[lead.status]}`}>
                              {leadStatusLabels[lead.status]}
                            </Badge>
                            {hasActiveNeg && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                            <span>{leadSourceLabels[lead.source]}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={hasActiveNeg ? "secondary" : "default"}
                          onClick={() => handleReactivate(lead)}
                          disabled={createNegotiation.isPending || updateLead.isPending}
                          className="ml-2 shrink-0"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          {hasActiveNeg ? 'Ver Pipeline' : 'Ativar'}
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nenhum lead encontrado para "{search}"
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {search.trim().length < 2 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}

          {/* Create New Button */}
          <div className="border-t pt-4">
            <Button
              onClick={handleCreateNew}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Novo Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
