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
  MapPin,
  ShoppingCart,
  Eye,
  Calendar,
  Car,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';

interface CustomerWithSale {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  sale_date: string;
  sale_price: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string | null;
}

// Hook para buscar clientes compradores (que compraram veículos)
function useBuyerCustomers() {
  return useQuery({
    queryKey: ['customers-buyers'],
    queryFn: async (): Promise<CustomerWithSale[]> => {
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
            cpf_cnpj,
            city,
            state,
            created_at
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
        city: sale.customer?.city,
        state: sale.customer?.state,
        created_at: sale.customer?.created_at || sale.sale_date,
        sale_date: sale.sale_date,
        sale_price: sale.sale_price,
        vehicle_brand: sale.vehicle?.brand || '',
        vehicle_model: sale.vehicle?.model || '',
        vehicle_plate: sale.vehicle?.plate,
      }));
    },
    staleTime: 30000,
  });
}

// Hook para buscar clientes vendedores (que venderam veículos para a loja)
function useSellerCustomers() {
  return useQuery({
    queryKey: ['customers-sellers'],
    queryFn: async (): Promise<CustomerWithSale[]> => {
      // Por enquanto retorna vazio - pode ser expandido quando tiver tabela de compras/aquisições
      return [];
    },
    staleTime: 30000,
  });
}

export default function Customers() {
  const { data: buyers, isLoading: loadingBuyers } = useBuyerCustomers();
  const { data: sellers, isLoading: loadingSellers } = useSellerCustomers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('buyers');

  const filteredBuyers = useMemo(() => {
    if (!searchQuery.trim() || !buyers) return buyers;
    
    const query = searchQuery.toLowerCase();
    return buyers.filter((customer) => {
      const name = customer.name?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      const email = customer.email?.toLowerCase() || '';
      const vehicle = `${customer.vehicle_brand} ${customer.vehicle_model}`.toLowerCase();
      
      return (
        name.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        vehicle.includes(query)
      );
    });
  }, [buyers, searchQuery]);

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim() || !sellers) return sellers;
    
    const query = searchQuery.toLowerCase();
    return sellers.filter((customer) => {
      const name = customer.name?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      
      return name.includes(query) || phone.includes(query);
    });
  }, [sellers, searchQuery]);

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

  const totalBuyersValue = buyers?.reduce((sum, b) => sum + (b.sale_price || 0), 0) || 0;
  const totalSellersValue = sellers?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0;

  return (
    <div>
      <ModuleHeader
        icon={UsersRound}
        title="Clientes"
        description="Gerencie compradores e vendedores"
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
                    <p className="text-2xl font-bold">{(buyers?.length || 0) + (sellers?.length || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total de Clientes</p>
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
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{buyers?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Compradores</p>
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
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{sellers?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Vendedores</p>
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
                    <p className="text-lg font-bold text-sky-600">{formatCurrency(totalBuyersValue)}</p>
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
              <TabsTrigger value="buyers" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Compradores
                <Badge variant="secondary" className="ml-1">{buyers?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="sellers" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Vendedores
                <Badge variant="secondary" className="ml-1">{sellers?.length || 0}</Badge>
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

          {/* Buyers Tab */}
          <TabsContent value="buyers" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loadingBuyers ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredBuyers && filteredBuyers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo Comprado</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data da Compra</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBuyers.map((customer, index) => (
                        <motion.tr
                          key={`${customer.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleOpenDetail(customer.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-emerald-600">
                                  {customer.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                {customer.cpf_cnpj && (
                                  <span className="text-xs text-muted-foreground">{customer.cpf_cnpj}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(customer.phone)}
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{customer.vehicle_brand} {customer.vehicle_model}</p>
                                {customer.vehicle_plate && (
                                  <span className="text-xs text-muted-foreground">{customer.vehicle_plate}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(customer.sale_price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(customer.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(customer.id);
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
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum comprador encontrado</h3>
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? 'Nenhum comprador corresponde à sua busca.'
                        : 'Compradores aparecerão aqui quando vendas forem concluídas.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loadingSellers ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredSellers && filteredSellers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo Vendido</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data da Venda</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSellers.map((customer, index) => (
                        <motion.tr
                          key={`${customer.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleOpenDetail(customer.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-amber-600">
                                  {customer.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                {customer.cpf_cnpj && (
                                  <span className="text-xs text-muted-foreground">{customer.cpf_cnpj}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(customer.phone)}
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{customer.vehicle_brand} {customer.vehicle_model}</p>
                                {customer.vehicle_plate && (
                                  <span className="text-xs text-muted-foreground">{customer.vehicle_plate}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-amber-600">
                              {formatCurrency(customer.sale_price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(customer.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(customer.id);
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
                    <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum vendedor cadastrado</h3>
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? 'Nenhum vendedor corresponde à sua busca.'
                        : 'Vendedores aparecerão aqui quando veículos forem adquiridos de particulares.'}
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
