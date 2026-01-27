import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import { parseDate } from '@/lib/utils';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  DollarSign,
  User,
  Edit,
  Save,
  X,
  ShoppingCart,
  Target,
  TrendingUp,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCustomerDetails, useUpdateCustomer } from '@/hooks/useCustomers';
import type { Customer } from '@/types/crm';

interface CustomerDetailSheetProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailSheetProps) {
  const { data: customerData, isLoading } = useCustomerDetails(customerId || '');
  const updateCustomer = useUpdateCustomer();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});

  const handleEdit = () => {
    if (customerData) {
      setEditForm({
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        cpf_cnpj: customerData.cpf_cnpj,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        notes: customerData.notes,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!customerId) return;
    updateCustomer.mutate(
      { id: customerId, ...editForm },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate stats
  const totalPurchases = customerData?.sales?.length || 0;
  const totalSpent = customerData?.sales?.reduce((sum: number, sale: any) => 
    sale.status === 'concluida' ? sum + (sale.sale_price || 0) : sum, 0) || 0;
  const activeNegotiations = customerData?.negotiations?.filter((n: any) => 
    !['ganho', 'perdido'].includes(n.status)).length || 0;

  if (!customerId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <AnimatedGradient colors={["#E53935", "#D32F2F", "#B71C1C"]} speed={0.03} blur="heavy" />
            <div className="relative z-10 p-6 pb-8">
              <SheetHeader className="mb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl text-foreground">Ficha do Cliente</SheetTitle>
                  {!isEditing ? (
                    <Button variant="secondary" size="sm" onClick={handleEdit} className="bg-background/80 hover:bg-background">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancel}
                        className="bg-background/80 hover:bg-background"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateCustomer.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
              </SheetHeader>

              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : customerData && (
                <motion.div 
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="h-16 w-16 rounded-full bg-background/90 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-lg font-semibold bg-background/80"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-foreground truncate">
                        {customerData.name}
                      </h2>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {customerData.cpf_cnpj && (
                        <Badge variant="secondary" className="bg-background/80">
                          {customerData.cpf_cnpj.length > 14 ? 'CNPJ' : 'CPF'}: {customerData.cpf_cnpj}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-background/50 text-foreground/80">
                        <Clock className="h-3 w-3 mr-1" />
                        Cliente desde {(() => { const d = parseDate(customerData.created_at); return d ? format(d, "MMM/yyyy", { locale: ptBR }) : '-'; })()}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : customerData && (
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <motion.div 
                className="grid grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{totalPurchases}</p>
                    <p className="text-xs text-muted-foreground">Compras</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">Total Gasto</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                  <CardContent className="p-4 text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-600">{activeNegotiations}</p>
                    <p className="text-xs text-muted-foreground">Negociações</p>
                  </CardContent>
                </Card>
              </motion.div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                  <TabsTrigger value="info">Dados</TabsTrigger>
                  <TabsTrigger value="sales">Vendas</TabsTrigger>
                  <TabsTrigger value="negotiations">Negoc.</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Contato
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          {isEditing ? (
                            <Input
                              value={editForm.phone || ''}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{customerData.phone}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          {isEditing ? (
                            <Input
                              value={editForm.email || ''}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              placeholder="email@exemplo.com"
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{customerData.email || 'Não informado'}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Endereço
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEditing ? (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Endereço</Label>
                            <Input
                              value={editForm.address || ''}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              placeholder="Rua, número, bairro"
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Cidade</Label>
                              <Input
                                value={editForm.city || ''}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Estado</Label>
                              <Input
                                value={editForm.state || ''}
                                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                            <Input
                              value={editForm.cpf_cnpj || ''}
                              onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="font-medium">{customerData.address || 'Endereço não informado'}</p>
                          {(customerData.city || customerData.state) && (
                            <p className="text-sm text-muted-foreground">
                              {[customerData.city, customerData.state].filter(Boolean).join(' - ')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Observações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <Textarea
                          value={editForm.notes || ''}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          placeholder="Anotações sobre o cliente..."
                          className="min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {customerData.notes || 'Nenhuma observação registrada'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-3 mt-4">
                  {customerData.sales && customerData.sales.length > 0 ? (
                    customerData.sales.map((sale: any, index: number) => (
                      <motion.div
                        key={sale.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                  sale.status === 'concluida' 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : sale.status === 'cancelada'
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                                }`}>
                                  {sale.status === 'concluida' ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : sale.status === 'cancelada' ? (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-yellow-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {sale.vehicle?.brand} {sale.vehicle?.model}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {sale.vehicle?.year_model} • {sale.vehicle?.plate || 'Sem placa'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${
                                  sale.status === 'concluida' ? 'text-green-600' : 'text-muted-foreground'
                                }`}>
                                  {formatCurrency(sale.sale_price)}
                                </p>
                                <Badge variant={
                                  sale.status === 'concluida' ? 'default' 
                                  : sale.status === 'cancelada' ? 'destructive' 
                                  : 'secondary'
                                } className="mt-1">
                                  {sale.status === 'concluida' ? 'Concluída' 
                                   : sale.status === 'cancelada' ? 'Cancelada' 
                                   : 'Pendente'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhuma venda registrada</p>
                        <p className="text-sm">As compras do cliente aparecerão aqui</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Negotiations Tab */}
                <TabsContent value="negotiations" className="space-y-3 mt-4">
                  {customerData.negotiations && customerData.negotiations.length > 0 ? (
                    customerData.negotiations.map((neg: any, index: number) => (
                      <motion.div
                        key={neg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                  neg.status === 'ganho' 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : neg.status === 'perdido'
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-blue-100 dark:bg-blue-900/30'
                                }`}>
                                  {neg.status === 'ganho' ? (
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                  ) : neg.status === 'perdido' ? (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <Target className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {neg.vehicle ? `${neg.vehicle.brand} ${neg.vehicle.model}` : 'Veículo não definido'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {format(new Date(neg.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {neg.estimated_value && (
                                  <p className="font-bold">{formatCurrency(neg.estimated_value)}</p>
                                )}
                                <Badge variant={
                                  neg.status === 'ganho' ? 'default' 
                                  : neg.status === 'perdido' ? 'destructive' 
                                  : 'secondary'
                                } className="mt-1 capitalize">
                                  {neg.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            {neg.notes && (
                              <p className="text-sm text-muted-foreground mt-3 pl-13 border-t pt-2">
                                {neg.notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhuma negociação registrada</p>
                        <p className="text-sm">O histórico de negociações aparecerá aqui</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-3 mt-4">
                  {customerData.interactions && customerData.interactions.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {customerData.interactions.map((interaction: any, index: number) => (
                          <motion.div
                            key={interaction.id}
                            className="relative pl-10"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            <div className="absolute left-2 top-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-background" />
                            </div>
                            <Card>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {interaction.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(interaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm">{interaction.description}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhuma interação registrada</p>
                        <p className="text-sm">O histórico de contatos aparecerá aqui</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}