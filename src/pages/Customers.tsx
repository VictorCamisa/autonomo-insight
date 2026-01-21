import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UsersRound,
  Search,
  Phone,
  Mail,
  Eye,
  Car,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';

interface CustomerWithVehicle {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj: string | null;
  date: string;
  price: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string | null;
}

// Hook para buscar veículos vendidos (clientes que compraram da loja)
function useSoldVehicles() {
  return useQuery({
    queryKey: ['customers-sold'],
    queryFn: async (): Promise<CustomerWithVehicle[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_date,
          sale_price,
          customer:customers!sales_customer_id_fkey(
            id,
            name,
            phone,
            email,
            cpf_cnpj
          ),
          vehicle:vehicles!sales_vehicle_id_fkey(
            brand,
            model,
            plate
          )
        `)
        .eq('status', 'concluida')
        .order('sale_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((sale: any) => ({
        id: sale.customer?.id || sale.id,
        name: sale.customer?.name || 'Cliente não identificado',
        phone: sale.customer?.phone || '',
        email: sale.customer?.email,
        cpf_cnpj: sale.customer?.cpf_cnpj,
        date: sale.sale_date,
        price: sale.sale_price,
        vehicle_brand: sale.vehicle?.brand || '',
        vehicle_model: sale.vehicle?.model || '',
        vehicle_plate: sale.vehicle?.plate,
      }));
    },
    staleTime: 30000,
  });
}

// Hook para buscar veículos comprados (de quem a loja comprou)
function usePurchasedVehicles() {
  return useQuery({
    queryKey: ['customers-purchased'],
    queryFn: async (): Promise<CustomerWithVehicle[]> => {
      // Por enquanto retorna vazio - será expandido quando tiver tabela de aquisições
      return [];
    },
    staleTime: 30000,
  });
}

export default function Customers() {
  const { data: soldVehicles, isLoading: loadingSold } = useSoldVehicles();
  const { data: purchasedVehicles, isLoading: loadingPurchased } = usePurchasedVehicles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sold');

  const filteredSold = useMemo(() => {
    if (!searchQuery.trim() || !soldVehicles) return soldVehicles;
    
    const query = searchQuery.toLowerCase();
    return soldVehicles.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const phone = item.phone?.toLowerCase() || '';
      const vehicle = `${item.vehicle_brand} ${item.vehicle_model}`.toLowerCase();
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query);
    });
  }, [soldVehicles, searchQuery]);

  const filteredPurchased = useMemo(() => {
    if (!searchQuery.trim() || !purchasedVehicles) return purchasedVehicles;
    
    const query = searchQuery.toLowerCase();
    return purchasedVehicles.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const phone = item.phone?.toLowerCase() || '';
      const vehicle = `${item.vehicle_brand} ${item.vehicle_model}`.toLowerCase();
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query);
    });
  }, [purchasedVehicles, searchQuery]);

  const handleOpenDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setDetailOpen(true);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalSoldValue = soldVehicles?.reduce((sum, v) => sum + (v.price || 0), 0) || 0;
  const totalPurchasedValue = purchasedVehicles?.reduce((sum, v) => sum + (v.price || 0), 0) || 0;

  return (
    <div>
      <ModuleHeader
        icon={UsersRound}
        title="Clientes"
        description="Histórico de compras e vendas de veículos"
        basePath="/clientes"
        navItems={[]}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(soldVehicles?.length || 0) + (purchasedVehicles?.length || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total de Transações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{soldVehicles?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Vendidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{purchasedVehicles?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Comprados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 border-sky-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sky-600">{formatCurrency(totalSoldValue)}</p>
                    <p className="text-sm text-muted-foreground">Total Vendido</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList>
              <TabsTrigger value="sold" className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Vendidos
                <Badge variant="secondary" className="ml-1">{soldVehicles?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="purchased" className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Comprados
                <Badge variant="secondary" className="ml-1">{purchasedVehicles?.length || 0}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, veículo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sold Tab (Veículos que a loja vendeu) */}
          <TabsContent value="sold" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loadingSold ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredSold && filteredSold.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente (Comprador)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo Vendido</TableHead>
                        <TableHead>Valor da Venda</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSold.map((item, index) => (
                        <motion.tr
                          key={`${item.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleOpenDetail(item.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-emerald-600">
                                  {item.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.cpf_cnpj && (
                                  <span className="text-xs text-muted-foreground">{item.cpf_cnpj}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(item.phone)}
                              </div>
                              {item.email && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {item.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{item.vehicle_brand} {item.vehicle_model}</p>
                                {item.vehicle_plate && (
                                  <span className="text-xs text-muted-foreground">{item.vehicle_plate}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma venda registrada</h3>
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? 'Nenhuma venda corresponde à sua busca.'
                        : 'Vendas aparecerão aqui quando forem concluídas.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchased Tab (Veículos que a loja comprou) */}
          <TabsContent value="purchased" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loadingPurchased ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredPurchased && filteredPurchased.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente (Vendedor)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo Comprado</TableHead>
                        <TableHead>Valor da Compra</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchased.map((item, index) => (
                        <motion.tr
                          key={`${item.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleOpenDetail(item.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-amber-600">
                                  {item.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.cpf_cnpj && (
                                  <span className="text-xs text-muted-foreground">{item.cpf_cnpj}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(item.phone)}
                              </div>
                              {item.email && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {item.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{item.vehicle_brand} {item.vehicle_model}</p>
                                {item.vehicle_plate && (
                                  <span className="text-xs text-muted-foreground">{item.vehicle_plate}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-amber-600">
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma compra registrada</h3>
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? 'Nenhuma compra corresponde à sua busca.'
                        : 'Compras de veículos aparecerão aqui quando forem cadastradas.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
