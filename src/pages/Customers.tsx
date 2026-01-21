import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Car,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  FileSpreadsheet,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePurchasedTransactions, useSoldTransactions } from '@/hooks/useVehicleTransactions';
import { ImportTransactionsDialog } from '@/components/customers/ImportTransactionsDialog';

// Hook para buscar vendas do sistema (clientes que compraram da loja)
function useSystemSales() {
  return useQuery({
    queryKey: ['customers-system-sales'],
    queryFn: async () => {
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
      return data || [];
    },
    staleTime: 30000,
  });
}

interface SoldItem {
  id: string;
  type: 'system' | 'history';
  name: string;
  phone: string | null;
  email?: string | null;
  cpf: string | null;
  address?: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  plate: string | null;
  date: string | null;
  price: number | null;
  km_out?: number | null;
  vehicle_number?: number | null;
  customer_id?: string;
}

interface PurchasedItem {
  id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  address: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  plate: string | null;
  date: string | null;
  chassis: string | null;
  vehicle_number: number | null;
}

export default function Customers() {
  const navigate = useNavigate();
  
  // Dados do sistema (vendas atuais)
  const { data: systemSales, isLoading: loadingSystemSales } = useSystemSales();
  
  // Dados históricos importados
  const { data: soldTransactions, isLoading: loadingSoldTransactions } = useSoldTransactions();
  const { data: purchasedTransactions, isLoading: loadingPurchasedTransactions } = usePurchasedTransactions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('sold');
  const [importOpen, setImportOpen] = useState(false);

  const loadingSold = loadingSystemSales || loadingSoldTransactions;
  const loadingPurchased = loadingPurchasedTransactions;

  // Combina vendas do sistema + histórico importado
  const allSoldItems = useMemo((): SoldItem[] => {
    const items: SoldItem[] = [];

    // Adiciona vendas do sistema
    systemSales?.forEach((sale: any) => {
      items.push({
        id: `system-${sale.id}`,
        type: 'system',
        name: sale.customer?.name || 'Cliente não identificado',
        phone: sale.customer?.phone,
        email: sale.customer?.email,
        cpf: sale.customer?.cpf_cnpj,
        vehicle_brand: sale.vehicle?.brand || '',
        vehicle_model: sale.vehicle?.model || '',
        plate: sale.vehicle?.plate,
        date: sale.sale_date,
        price: sale.sale_price,
        customer_id: sale.customer?.id,
      });
    });

    // Adiciona histórico importado
    soldTransactions?.forEach((tx) => {
      items.push({
        id: `history-${tx.id}`,
        type: 'history',
        name: tx.buyer_name || '-',
        phone: tx.buyer_phone,
        cpf: tx.buyer_cpf,
        address: tx.buyer_address,
        vehicle_brand: tx.brand || '',
        vehicle_model: tx.model || '',
        plate: tx.plate,
        date: tx.sale_date,
        price: tx.sale_price,
        km_out: tx.km_out,
        vehicle_number: tx.vehicle_number,
      });
    });

    // Ordena por data (mais recente primeiro)
    return items.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [systemSales, soldTransactions]);

  // Processa compras (histórico importado)
  const allPurchasedItems = useMemo((): PurchasedItem[] => {
    return (purchasedTransactions || []).map((tx) => ({
      id: tx.id,
      name: tx.seller_name || '-',
      phone: tx.seller_phone,
      cpf: tx.seller_cpf,
      address: tx.seller_address,
      vehicle_brand: tx.brand || '',
      vehicle_model: tx.model || '',
      plate: tx.plate,
      date: tx.purchase_date,
      chassis: tx.chassis,
      vehicle_number: tx.vehicle_number,
    }));
  }, [purchasedTransactions]);

  const filteredSold = useMemo(() => {
    if (!searchQuery.trim()) return allSoldItems;
    
    const query = searchQuery.toLowerCase();
    return allSoldItems.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const phone = item.phone?.toLowerCase() || '';
      const vehicle = `${item.vehicle_brand} ${item.vehicle_model}`.toLowerCase();
      const plate = item.plate?.toLowerCase() || '';
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query) || plate.includes(query);
    });
  }, [allSoldItems, searchQuery]);

  const filteredPurchased = useMemo(() => {
    if (!searchQuery.trim()) return allPurchasedItems;
    
    const query = searchQuery.toLowerCase();
    return allPurchasedItems.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const phone = item.phone?.toLowerCase() || '';
      const vehicle = `${item.vehicle_brand} ${item.vehicle_model}`.toLowerCase();
      const plate = item.plate?.toLowerCase() || '';
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query) || plate.includes(query);
    });
  }, [allPurchasedItems, searchQuery]);

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const handleOpenDetail = (customerId: string) => {
    navigate(`/clientes/${customerId}`);
  };

  const totalSold = allSoldItems.length;
  const totalPurchased = allPurchasedItems.length;
  const totalTransactions = totalSold + totalPurchased;

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
                    <p className="text-2xl font-bold">{totalTransactions}</p>
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
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{totalSold}</p>
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
            <Card className="border-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalPurchased}</p>
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
            <Card className="border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => setImportOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Importar Planilha
                    </Button>
                    <p className="text-sm text-muted-foreground">Excel/XLSX</p>
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
                <Badge variant="secondary" className="ml-1">{totalSold}</Badge>
              </TabsTrigger>
              <TabsTrigger value="purchased" className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Comprados
                <Badge variant="secondary" className="ml-1">{totalPurchased}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, veículo, placa..."
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
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredSold.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Cliente (Comprador)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSold.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.01 }}
                          className="group hover:bg-muted/50"
                        >
                          <TableCell>
                            {item.type === 'system' ? (
                              <Badge variant="default" className="text-xs">Sistema</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{item.vehicle_number || 'Hist'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                  {item.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.cpf && (
                                  <span className="text-xs text-muted-foreground">{item.cpf}</span>
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
                              {item.address && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[180px]">{item.address}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{item.vehicle_brand} {item.vehicle_model}</span>
                                {item.plate && (
                                  <p className="text-xs text-muted-foreground font-mono">{item.plate}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{formatDate(item.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.type === 'system' && item.customer_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDetail(item.customer_id!)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma venda registrada</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {searchQuery
                        ? 'Nenhuma venda corresponde à sua busca.'
                        : 'Importe sua planilha para visualizar o histórico de vendas.'}
                    </p>
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Planilha
                    </Button>
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
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredPurchased.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente (Vendedor)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Data da Compra</TableHead>
                        <TableHead>Chassi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchased.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.01 }}
                          className="group hover:bg-muted/50"
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.vehicle_number || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                  {item.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.cpf && (
                                  <span className="text-xs text-muted-foreground">{item.cpf}</span>
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
                              {item.address && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[180px]">{item.address}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{item.vehicle_brand} {item.vehicle_model}</span>
                                {item.plate && (
                                  <p className="text-xs text-muted-foreground font-mono">{item.plate}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{formatDate(item.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block">
                              {item.chassis || '-'}
                            </span>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma compra registrada</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {searchQuery
                        ? 'Nenhuma compra corresponde à sua busca.'
                        : 'Importe sua planilha para visualizar o histórico de compras.'}
                    </p>
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Planilha
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ImportTransactionsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
