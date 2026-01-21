import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCustomers } from '@/hooks/useCustomers';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';
import type { Customer } from '@/types/crm';

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim() || !customers) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      const email = customer.email?.toLowerCase() || '';
      const cpfCnpj = customer.cpf_cnpj?.toLowerCase() || '';
      const city = customer.city?.toLowerCase() || '';
      
      return (
        name.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        cpfCnpj.includes(query) ||
        city.includes(query)
      );
    });
  }, [customers, searchQuery]);

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

  return (
    <div>
      <ModuleHeader
        icon={UsersRound}
        title="Clientes"
        description="Gerencie sua base de clientes"
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
                    <p className="text-2xl font-bold">{customers?.length || 0}</p>
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
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {customers?.filter(c => c.lead_id).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Vindos do CRM</p>
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
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {customers?.filter(c => {
                        const createdAt = new Date(c.created_at);
                        const now = new Date();
                        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
                      }).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Novos este mês</p>
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
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {customers?.filter(c => c.city).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Com endereço</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, email, CPF/CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredCustomers?.length || 0} cliente(s)
            </Badge>
          </div>
        </div>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Cliente desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDetail(customer.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {customer.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.lead_id && (
                              <Badge variant="secondary" className="text-xs">
                                CRM
                              </Badge>
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
                        {customer.city || customer.state ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {[customer.city, customer.state].filter(Boolean).join(' - ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.cpf_cnpj ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {customer.cpf_cnpj}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? 'Nenhum cliente corresponde à sua busca.'
                    : 'Clientes serão criados automaticamente quando uma venda for concluída.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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
