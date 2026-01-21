import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSales, useDeleteSale } from '@/hooks/useSales';
import { SaleCard } from '@/components/sales/SaleCard';
import { SaleForm } from '@/components/sales/SaleForm';
import { useAuth } from '@/contexts/AuthContext';
import type { Sale } from '@/types/sales';

export function SalesListPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: sales, isLoading } = useSales();
  const deleteSale = useDeleteSale();
  const { role } = useAuth();

  const isManager = role === 'gerente';

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
              onEdit={isManager ? handleEdit : undefined}
              onDelete={isManager ? handleDelete : undefined}
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
    </div>
  );
}
