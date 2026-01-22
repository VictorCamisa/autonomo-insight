import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSales, useDeleteSale } from '@/hooks/useSales';
import { useContracts } from '@/hooks/useContracts';
import { SaleCard } from '@/components/sales/SaleCard';
import { SaleForm } from '@/components/sales/SaleForm';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Sale } from '@/types/sales';
import type { ContractFormData } from '@/hooks/useContracts';

export function SalesListPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractInitialData, setContractInitialData] = useState<Partial<ContractFormData> | undefined>();
  
  const { data: sales, isLoading } = useSales();
  const { contracts } = useContracts();
  const deleteSale = useDeleteSale();
  const { role } = useAuth();

  const isManager = role === 'gerente';

  // Check if a sale has a contract based on vehicle_id and customer_id
  const saleHasContract = (sale: Sale): boolean => {
    if (!sale.vehicle_id || !sale.customer_id) return false;
    return contracts.some(
      (c) => c.vehicle_id === sale.vehicle_id && c.customer_id === sale.customer_id
    );
  };

  // Filter sales by search query
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim() || !sales) return sales;
    
    const query = searchQuery.toLowerCase();
    return sales.filter((sale) => {
      const vehicleInfo = sale.vehicle 
        ? `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.plate || ''}`.toLowerCase() 
        : '';
      const customerName = sale.customer?.name?.toLowerCase() || '';
      const customerPhone = sale.customer?.phone?.toLowerCase() || '';
      const paymentMethod = sale.payment_method?.toLowerCase() || '';
      const salePrice = sale.sale_price?.toString() || '';
      
      return (
        vehicleInfo.includes(query) ||
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        paymentMethod.includes(query) ||
        salePrice.includes(query)
      );
    });
  }, [sales, searchQuery]);

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      await deleteSale.mutateAsync(id);
    }
  };

  const handleGenerateContract = (sale: Sale) => {
    // Prepara os dados iniciais do contrato com todos os campos disponíveis
    const initialData: Partial<ContractFormData> = {
      contract_type: 'venda',
      customer_id: sale.customer_id,
      customer_name: sale.customer?.name || '',
      customer_cpf: sale.customer?.cpf_cnpj || '',
      customer_rg: sale.customer?.rg || '',
      customer_phone: sale.customer?.phone || '',
      customer_email: sale.customer?.email || '',
      customer_address: sale.customer?.address || '',
      customer_city: sale.customer?.city || '',
      customer_state: sale.customer?.state || '',
      vehicle_id: sale.vehicle_id,
      vehicle_brand: sale.vehicle?.brand || '',
      vehicle_model: sale.vehicle?.model || '',
      vehicle_year: sale.vehicle?.year_fabrication && sale.vehicle?.year_model 
        ? `${sale.vehicle.year_fabrication}/${sale.vehicle.year_model}` 
        : sale.vehicle?.year_model?.toString() || '',
      vehicle_plate: sale.vehicle?.plate || '',
      vehicle_color: sale.vehicle?.color || '',
      vehicle_renavam: sale.vehicle?.renavam || '',
      vehicle_odometer: sale.vehicle?.km || 0,
      vehicle_value: sale.sale_price || 0,
    };

    setContractInitialData(initialData);
    setContractDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Todas as Vendas</h2>
          <p className="text-muted-foreground">
            {filteredSales?.length || 0} vendas {searchQuery ? 'encontradas' : 'registradas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por veículo, cliente, placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[280px]"
            />
          </div>
          {isManager && (
            <Button onClick={() => { setEditingSale(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Venda
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              hasContract={saleHasContract(sale)}
              onEdit={isManager ? handleEdit : undefined}
              onDelete={isManager ? handleDelete : undefined}
              onGenerateContract={handleGenerateContract}
            />
          ))}
          {filteredSales?.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              {searchQuery ? 'Nenhuma venda encontrada com essa busca' : 'Nenhuma venda registrada'}
            </p>
          )}
        </div>
      )}

      <SaleForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        sale={editingSale} 
      />

      <ContractFormDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        initialData={contractInitialData}
      />
    </div>
  );
}
