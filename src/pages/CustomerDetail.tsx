import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft,
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

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customerData, isLoading } = useCustomerDetails(id || '');
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
    if (!id) return;
    updateCustomer.mutate(
      { id, ...editForm },
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

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Calculate stats
  const totalPurchases = customerData?.sales?.length || 0;
  const totalSpent = customerData?.sales?.reduce((sum: number, sale: any) => 
    sale.status === 'concluida' ? sum + (sale.sale_price || 0) : sum, 0) || 0;
  const activeNegotiations = customerData?.negotiations?.filter((n: any) => 
    !['ganho', 'perdido'].includes(n.status)).length || 0;

  if (!id) {
    return (
      <div className="p-6">
        <p>Cliente não encontrado</p>
      </div>
    );
  }

  return (
    <div>
      <ModuleHeader
        icon={UsersRound}
        title="Detalhes do Cliente"
        description="Visualize e edite informações do cliente"
        basePath="/clientes"
        navItems={[]}
      />

      <div className="p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/clientes')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Button>

          {!isEditing ? (
            <Button onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar Cliente
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateCustomer.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : customerData ? (
          <>
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>CPF/CNPJ</Label>
                            <Input
                              value={editForm.cpf_cnpj || ''}
                              onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h1 className="text-2xl font-bold">{customerData.name}</h1>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {customerData.cpf_cnpj && (
                              <Badge variant="secondary">
                                {customerData.cpf_cnpj.length > 14 ? 'CNPJ' : 'CPF'}: {customerData.cpf_cnpj}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Cliente desde {format(new Date(customerData.created_at), "MMM/yyyy", { locale: ptBR })}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <ShoppingCart className="h-8 w-8 text-emerald-600" />
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{totalPurchases}</p>
                        <p className="text-sm text-muted-foreground">Compras Realizadas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      <DollarSign className="h-8 w-8 text-sky-600" />
                      <div>
                        <p className="text-xl font-bold text-sky-600">{formatCurrency(totalSpent)}</p>
                        <p className="text-sm text-muted-foreground">Total Gasto</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <Target className="h-8 w-8 text-violet-600" />
                      <div>
                        <p className="text-2xl font-bold text-violet-600">{activeNegotiations}</p>
                        <p className="text-sm text-muted-foreground">Negociações Ativas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="h-5 w-5 text-primary" />
                      Informações de Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Telefone</Label>
                        {isEditing ? (
                          <Input
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {formatPhone(customerData.phone)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">Email</Label>
                        {isEditing ? (
                          <Input
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {customerData.email || 'Não informado'}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Address */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                      Endereço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <Label className="text-muted-foreground text-sm">Endereço</Label>
                          <Input
                            value={editForm.address || ''}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            placeholder="Rua, número, bairro"
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground text-sm">Cidade</Label>
                            <Input
                              value={editForm.city || ''}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-sm">Estado</Label>
                            <Input
                              value={editForm.state || ''}
                              onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="font-medium">{customerData.address || 'Endereço não informado'}</p>
                        {(customerData.city || customerData.state) && (
                          <p className="text-muted-foreground">
                            {[customerData.city, customerData.state].filter(Boolean).join(' - ')}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Anotações sobre o cliente..."
                      className="min-h-[120px]"
                    />
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {customerData.notes || 'Nenhuma observação registrada'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Sales History */}
            {customerData.sales && customerData.sales.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Histórico de Compras
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerData.sales.map((sale: any) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {sale.vehicle?.brand} {sale.vehicle?.model}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {sale.vehicle?.year_model} • {sale.vehicle?.plate || 'Sem placa'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  sale.status === 'concluida'
                                    ? 'default'
                                    : sale.status === 'cancelada'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className={
                                  sale.status === 'concluida'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : ''
                                }
                              >
                                {sale.status === 'concluida' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {sale.status === 'cancelada' && <XCircle className="h-3 w-3 mr-1" />}
                                {sale.status === 'concluida' ? 'Concluída' : sale.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(sale.sale_price)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">
                                {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Negotiations */}
            {customerData.negotiations && customerData.negotiations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-primary" />
                      Negociações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Valor Estimado</TableHead>
                          <TableHead>Probabilidade</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerData.negotiations.map((neg: any) => (
                          <TableRow key={neg.id}>
                            <TableCell>
                              <Badge variant="outline">{neg.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {neg.estimated_value ? formatCurrency(neg.estimated_value) : '-'}
                            </TableCell>
                            <TableCell>
                              {neg.probability ? `${neg.probability}%` : '-'}
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">
                                {format(new Date(neg.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Interactions */}
            {customerData.interactions && customerData.interactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Histórico de Interações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customerData.interactions.slice(0, 10).map((interaction: any) => (
                        <div
                          key={interaction.id}
                          className="flex gap-4 p-4 rounded-lg border bg-muted/30"
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {interaction.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(interaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm">{interaction.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Cliente não encontrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              O cliente solicitado não existe ou foi removido.
            </p>
            <Button onClick={() => navigate('/clientes')}>
              Voltar para Clientes
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
