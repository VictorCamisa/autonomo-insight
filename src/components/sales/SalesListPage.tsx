import { useState, useMemo } from 'react';
import { Plus, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSales, useDeleteSale } from '@/hooks/useSales';
import { useContracts } from '@/hooks/useContracts';
import { SaleCard } from '@/components/sales/SaleCard';
import { SaleForm } from '@/components/sales/SaleForm';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Sale } from '@/types/sales';
import type { ContractFormData } from '@/hooks/useContracts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SalesListPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractInitialData, setContractInitialData] = useState<Partial<ContractFormData> | undefined>();
  
  const { data: sales, isLoading } = useSales();
  const { contracts } = useContracts();
  const deleteSale = useDeleteSale();
  const { role } = useAuth();

  const isManager = role === 'gerente';

  // Generate available months from sales data
  const availableMonths = useMemo(() => {
    if (!sales) return [];
    const months = new Set<string>();
    sales.forEach((sale) => {
      if (sale.sale_date) {
        const month = sale.sale_date.substring(0, 7); // YYYY-MM
        months.add(month);
      }
    });
    return Array.from(months).sort().reverse();
  }, [sales]);

  // Check if a sale has a contract
  const saleHasContract = (sale: Sale): boolean => {
    if (!sale.vehicle_id || !sale.customer_id) return false;
    return contracts.some(
      (c) => c.vehicle_id === sale.vehicle_id && c.customer_id === sale.customer_id
    );
  };

  // Filter sales by search query and month
  const filteredSales = useMemo(() => {
    let result = sales || [];
    
    if (monthFilter !== 'all') {
      result = result.filter((sale) => sale.sale_date?.startsWith(monthFilter));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((sale) => {
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
    }

    return result;
  }, [sales, searchQuery, monthFilter]);

  // Group sales by month
  const groupedSales = useMemo(() => {
    const groups: Record<string, { sales: Sale[]; total: number; count: number }> = {};
    
    (filteredSales || []).forEach((sale) => {
      const monthKey = sale.sale_date?.substring(0, 7) || 'sem-data';
      if (!groups[monthKey]) {
        groups[monthKey] = { sales: [], total: 0, count: 0 };
      }
      groups[monthKey].sales.push(sale);
      groups[monthKey].total += sale.sale_price || 0;
      groups[monthKey].count += 1;
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a));
  }, [filteredSales]);

  const formatMonthLabel = (monthKey: string) => {
    if (monthKey === 'sem-data') return 'Sem data';
    try {
      return format(parseISO(`${monthKey}-01`), "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return monthKey;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

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
            {filteredSales?.length || 0} vendas {searchQuery || monthFilter !== 'all' ? 'encontradas' : 'registradas'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por veículo, cliente, placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[280px]"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isManager && (
            <Button onClick={() => { setEditingSale(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Venda
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : groupedSales.length > 0 ? (
        <div className="space-y-8">
          {groupedSales.map(([monthKey, group]) => (
            <div key={monthKey}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold capitalize">
                  {formatMonthLabel(monthKey)}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{group.count} {group.count === 1 ? 'venda' : 'vendas'}</span>
                  <span className="font-medium text-foreground">{formatCurrency(group.total)}</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.sales.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    hasContract={saleHasContract(sale)}
                    onEdit={isManager ? handleEdit : undefined}
                    onDelete={isManager ? handleDelete : undefined}
                    onGenerateContract={handleGenerateContract}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          {searchQuery || monthFilter !== 'all' ? 'Nenhuma venda encontrada com esses filtros' : 'Nenhuma venda registrada'}
        </p>
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
