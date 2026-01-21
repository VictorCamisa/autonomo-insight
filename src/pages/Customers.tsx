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
  ShoppingCart,
  Upload,
  FileSpreadsheet,
  MapPin,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePurchasedTransactions, useSoldTransactions } from '@/hooks/useVehicleTransactions';
import { ImportTransactionsDialog } from '@/components/customers/ImportTransactionsDialog';

export default function Customers() {
  const navigate = useNavigate();
  const { data: soldTransactions, isLoading: loadingSold } = useSoldTransactions();
  const { data: purchasedTransactions, isLoading: loadingPurchased } = usePurchasedTransactions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('sold');
  const [importOpen, setImportOpen] = useState(false);

  const filteredSold = useMemo(() => {
    if (!searchQuery.trim() || !soldTransactions) return soldTransactions;
    
    const query = searchQuery.toLowerCase();
    return soldTransactions.filter((item) => {
      const name = item.buyer_name?.toLowerCase() || '';
      const phone = item.buyer_phone?.toLowerCase() || '';
      const vehicle = `${item.brand} ${item.model}`.toLowerCase();
      const plate = item.plate?.toLowerCase() || '';
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query) || plate.includes(query);
    });
  }, [soldTransactions, searchQuery]);

  const filteredPurchased = useMemo(() => {
    if (!searchQuery.trim() || !purchasedTransactions) return purchasedTransactions;
    
    const query = searchQuery.toLowerCase();
    return purchasedTransactions.filter((item) => {
      const name = item.seller_name?.toLowerCase() || '';
      const phone = item.seller_phone?.toLowerCase() || '';
      const vehicle = `${item.brand} ${item.model}`.toLowerCase();
      const plate = item.plate?.toLowerCase() || '';
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query) || plate.includes(query);
    });
  }, [purchasedTransactions, searchQuery]);

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

  const totalSold = soldTransactions?.length || 0;
  const totalPurchased = purchasedTransactions?.length || 0;
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
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{totalSold}</p>
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
                    <p className="text-2xl font-bold text-amber-600">{totalPurchased}</p>
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
                    <FileSpreadsheet className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sky-600 hover:text-sky-700 p-0 h-auto"
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
                ) : filteredSold && filteredSold.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente (Comprador)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Data da Venda</TableHead>
                        <TableHead>KM Saída</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSold.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50"
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.vehicle_number || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-emerald-600">
                                  {item.buyer_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.buyer_name || '-'}</p>
                                {item.buyer_cpf && (
                                  <span className="text-xs text-muted-foreground">{item.buyer_cpf}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(item.buyer_phone)}
                              </div>
                              {item.buyer_address && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{item.buyer_address}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{item.brand} {item.model}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{item.plate || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{formatDate(item.sale_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.km_out ? `${item.km_out.toLocaleString('pt-BR')} km` : '-'}
                            </span>
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
                ) : filteredPurchased && filteredPurchased.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente (Vendedor)</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Placa</TableHead>
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
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-muted/50"
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.vehicle_number || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-amber-600">
                                  {item.seller_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{item.seller_name || '-'}</p>
                                {item.seller_cpf && (
                                  <span className="text-xs text-muted-foreground">{item.seller_cpf}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatPhone(item.seller_phone)}
                              </div>
                              {item.seller_address && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{item.seller_address}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{item.brand} {item.model}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{item.plate || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{formatDate(item.purchase_date)}</span>
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
