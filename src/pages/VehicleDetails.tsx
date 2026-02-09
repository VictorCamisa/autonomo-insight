import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Gauge, Car, DollarSign, Clock, TrendingUp, TrendingDown, AlertTriangle, Globe, EyeOff, Image, Share2, Copy, FileText, Bookmark, CircleCheck, CircleDashed, Wrench, Paperclip, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { parseDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehiclePhotosUpload } from '@/components/inventory/VehiclePhotosUpload';
import { VehicleSaleSimulator } from '@/components/inventory/VehicleSaleSimulator';
import { VehicleActiveNegotiations } from '@/components/inventory/VehicleActiveNegotiations';
import { VehicleDocuments } from '@/components/inventory/VehicleDocuments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleForm } from '@/components/inventory/VehicleForm';
import { VehicleCostForm } from '@/components/inventory/VehicleCostForm';
import type { VehicleCostEditData } from '@/components/inventory/VehicleCostForm';
import { useVehicle, useVehicleDRE, useVehicleCosts, useUpdateVehicle, useDeleteVehicle, useCreateVehicleCost, useDeleteVehicleCost, useUpdateVehicleCost } from '@/hooks/useVehicles';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleStatusLabels, vehicleStatusColors, vehicleCostTypeLabels, fuelTypeLabels, transmissionLabels } from '@/types/inventory';
import type { VehicleDRE, VehicleStatus } from '@/types/inventory';
import { toast } from 'sonner';

export default function VehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<VehicleCostEditData | null>(null);
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading } = useVehicle(id!);
  const { data: dreData, isLoading: dreLoading } = useVehicleDRE(id);
  const { data: costs, isLoading: costsLoading } = useVehicleCosts(id!);
  
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const createCost = useCreateVehicleCost();
  const deleteCost = useDeleteVehicleCost();
  const updateCost = useUpdateVehicleCost();

  const isManager = role === 'gerente';
  const dre = dreData as VehicleDRE | null;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    const parsed = parseDate(date);
    if (!parsed) return '-';
    return parsed.toLocaleDateString('pt-BR');
  };

  if (isLoading || dreLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veículo não encontrado</p>
        <Button variant="link" onClick={() => navigate('/estoque')}>
          Voltar ao estoque
        </Button>
      </div>
    );
  }

  const handleUpdateVehicle = (data: Parameters<typeof updateVehicle.mutate>[0]) => {
    updateVehicle.mutate(
      { id: vehicle.id, ...data },
      { onSuccess: () => setIsEditDialogOpen(false) }
    );
  };

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => navigate('/estoque'),
    });
  };

  const handleAddCost = (data: Parameters<typeof createCost.mutate>[0]) => {
    if (editingCost) {
      updateCost.mutate({
        id: editingCost.id,
        vehicleId: vehicle.id,
        oldDescription: editingCost.description,
        oldAmount: editingCost.amount,
        cost_type: data.cost_type,
        description: data.description,
        amount: data.amount,
        cost_date: data.cost_date,
      }, {
        onSuccess: () => {
          setEditingCost(null);
          setIsCostDialogOpen(false);
        },
      });
    } else {
      createCost.mutate(data, {
        onSuccess: () => setIsCostDialogOpen(false),
      });
    }
  };

  const handleEditCost = (cost: { id: string; cost_type: string; description: string; amount: number; cost_date?: string | null }) => {
    setEditingCost({
      id: cost.id,
      cost_type: cost.cost_type as any,
      description: cost.description,
      amount: cost.amount,
      cost_date: cost.cost_date,
    });
    setIsCostDialogOpen(true);
  };

  const handleToggleFeatured = () => {
    updateVehicle.mutate({ id: vehicle.id, featured: !vehicle.featured });
  };

  const handleChangeStatus = (newStatus: VehicleStatus) => {
    updateVehicle.mutate({ id: vehicle.id, status: newStatus });
  };

  const getStatusIcon = (status: VehicleStatus) => {
    switch (status) {
      case 'disponivel': return <CircleDashed className="h-4 w-4" />;
      case 'reservado': return <Bookmark className="h-4 w-4" />;
      case 'vendido': return <CircleCheck className="h-4 w-4" />;
      case 'em_manutencao': return <Wrench className="h-4 w-4" />;
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🚗 *${vehicle.brand} ${vehicle.model}*\n${vehicle.version || ''}\n📅 ${vehicle.year_fabrication}/${vehicle.year_model}\n⛽ ${fuelTypeLabels[vehicle.fuel_type]}\n📍 ${vehicle.km.toLocaleString('pt-BR')} km\n💰 ${formatCurrency(vehicle.sale_price)}\n\nEntre em contato para mais informações!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/estoque/${vehicle.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  // Cálculos DRE
  const totalCost = dre ? dre.total_investment : (vehicle.purchase_price || 0);
  const potentialMargin = dre && dre.sale_price 
    ? dre.sale_price - dre.total_investment 
    : null;
  const marginPercent = dre && dre.sale_price && dre.total_investment > 0
    ? ((potentialMargin || 0) / dre.total_investment) * 100
    : null;
  const isOverdue = dre && dre.expected_sale_days && dre.days_in_stock > dre.expected_sale_days;
  const costVariance = dre ? dre.total_real_costs - dre.total_estimated_costs : 0;

  return (
    <div className="space-y-6">
      {/* Botão de visibilidade no site - bem destacado */}
      {isManager && (
        <Button
          variant={vehicle.featured ? "default" : "outline"}
          size="lg"
          className={`w-full ${vehicle.featured ? 'bg-green-600 hover:bg-green-700' : 'border-dashed'}`}
          onClick={handleToggleFeatured}
          disabled={updateVehicle.isPending}
        >
          {vehicle.featured ? (
            <>
              <Globe className="h-5 w-5 mr-2" />
              Visível no Site - Clique para ocultar
            </>
          ) : (
            <>
              <EyeOff className="h-5 w-5 mr-2" />
              Oculto do Site - Clique para mostrar
            </>
          )}
        </Button>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/estoque')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {vehicle.brand} {vehicle.model}
            </h1>
            <Badge className={vehicleStatusColors[vehicle.status]}>
              {vehicleStatusLabels[vehicle.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {vehicle.version} • {vehicle.year_fabrication}/{vehicle.year_model}
            {vehicle.plate && ` • ${vehicle.plate}`}
          </p>
        </div>

        {isManager && (
          <div className="flex gap-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Veículo</DialogTitle>
                </DialogHeader>
                <VehicleForm
                  vehicle={vehicle}
                  onSubmit={handleUpdateVehicle}
                  isLoading={updateVehicle.isPending}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os custos associados também serão excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteVehicle}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Cards de Resumo: Custo + Simulador + Negociações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card de Custo Total Atual */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-primary" />
              Custo Total Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary mb-2">
              {formatCurrency(totalCost)}
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Valor de Compra:</span>
                <span className="font-medium text-foreground">{formatCurrency(vehicle.purchase_price)}</span>
              </div>
              {dre && dre.total_real_costs > 0 && (
                <div className="flex justify-between">
                  <span>Custos Adicionais:</span>
                  <span className="font-medium text-foreground">{formatCurrency(dre.total_real_costs)}</span>
                </div>
              )}
            </div>
            {dre && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {dre.days_in_stock} dias em estoque
                  {dre.expected_sale_days && ` (meta: ${dre.expected_sale_days})`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simulador de Venda */}
        <VehicleSaleSimulator
          totalCost={totalCost}
          suggestedPrice={vehicle.sale_price}
          minimumPrice={vehicle.minimum_price}
        />

        {/* Negociações Ativas */}
        <VehicleActiveNegotiations vehicleId={vehicle.id} />
      </div>

      {/* Funções Úteis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Dropdown de Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updateVehicle.isPending}
                >
                  {getStatusIcon(vehicle.status)}
                  <span className="ml-2">Status: {vehicleStatusLabels[vehicle.status]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => handleChangeStatus('disponivel')}
                  className={vehicle.status === 'disponivel' ? 'bg-accent' : ''}
                >
                  <CircleDashed className="h-4 w-4 mr-2 text-green-600" />
                  Disponível
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleChangeStatus('reservado')}
                  className={vehicle.status === 'reservado' ? 'bg-accent' : ''}
                >
                  <Bookmark className="h-4 w-4 mr-2 text-yellow-600" />
                  Reservado
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleChangeStatus('vendido')}
                  className={vehicle.status === 'vendido' ? 'bg-accent' : ''}
                >
                  <CircleCheck className="h-4 w-4 mr-2 text-blue-600" />
                  Vendido
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleChangeStatus('em_manutencao')}
                  className={vehicle.status === 'em_manutencao' ? 'bg-accent' : ''}
                >
                  <Wrench className="h-4 w-4 mr-2 text-orange-600" />
                  Em Manutenção
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <Share2 className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Orçamento PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-1">
            <Image className="h-4 w-4" />
            Fotos ({vehicle.images?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-1">
            <Paperclip className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="costs">Custos ({costs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dados do Veículo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Dados do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cor</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portas</p>
                    <p className="font-medium">{vehicle.doors || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Combustível</p>
                    <p className="font-medium">{fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Câmbio</p>
                    <p className="font-medium">{transmissionLabels[vehicle.transmission] || vehicle.transmission}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quilometragem</p>
                    <p className="font-medium">{vehicle.km.toLocaleString('pt-BR')} km</p>
                  </div>
                  {vehicle.renavam && (
                    <div>
                      <p className="text-sm text-muted-foreground">RENAVAM</p>
                      <p className="font-medium font-mono">{vehicle.renavam}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dados Financeiros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Dados Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor de Compra</p>
                    <p className="font-medium">{formatCurrency(vehicle.purchase_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Compra</p>
                    <p className="font-medium">{formatDate(vehicle.purchase_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço de Venda</p>
                    <p className="font-medium text-lg">{formatCurrency(vehicle.sale_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço Mínimo</p>
                    <p className="font-medium">{formatCurrency(vehicle.minimum_price)}</p>
                  </div>
                  {vehicle.fipe_price_at_purchase && (
                    <div>
                      <p className="text-sm text-muted-foreground">FIPE na Compra</p>
                      <p className="font-medium">{formatCurrency(vehicle.fipe_price_at_purchase)}</p>
                    </div>
                  )}
                  {vehicle.purchase_source && (
                    <div>
                      <p className="text-sm text-muted-foreground">Origem</p>
                      <p className="font-medium">{vehicle.purchase_source}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {vehicle.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{vehicle.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <VehiclePhotosUpload
            vehicleId={vehicle.id}
            images={vehicle.images || null}
            onImagesUpdate={() => {
              // Refetch vehicle data
              queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            }}
            isManager={isManager}
          />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <VehicleDocuments vehicleId={vehicle.id} isManager={isManager} />
        </TabsContent>

        <TabsContent value="dre" className="space-y-4 mt-4">
          {dre ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resumo do Investimento */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Investimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor de Compra</span>
                    <span className="font-medium">{formatCurrency(dre.purchase_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custos Adicionais</span>
                    <span className="font-medium">{formatCurrency(dre.total_real_costs)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between">
                    <span className="font-semibold">Investimento Total</span>
                    <span className="font-bold text-lg">{formatCurrency(dre.total_investment)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Margem e Resultado */}
              <Card>
                <CardHeader>
                  <CardTitle>Resultado Projetado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço de Venda</span>
                    <span className="font-medium">{formatCurrency(dre.sale_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Investimento Total</span>
                    <span className="font-medium">{formatCurrency(dre.total_investment)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-semibold flex items-center gap-2">
                      {potentialMargin !== null && potentialMargin >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                      Margem Projetada
                    </span>
                    <div className="text-right">
                      <span className={`font-bold text-xl ${potentialMargin !== null && potentialMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(potentialMargin)}
                      </span>
                      {marginPercent !== null && (
                        <span className="text-sm text-muted-foreground block">
                          ({marginPercent.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custos por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Custos por Categoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dre.cost_manutencao > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Manutenção</span>
                      <span>{formatCurrency(dre.cost_manutencao)}</span>
                    </div>
                  )}
                  {dre.cost_documentacao > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Documentação</span>
                      <span>{formatCurrency(dre.cost_documentacao)}</span>
                    </div>
                  )}
                  {dre.cost_limpeza > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Limpeza</span>
                      <span>{formatCurrency(dre.cost_limpeza)}</span>
                    </div>
                  )}
                  {dre.cost_ipva > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IPVA</span>
                      <span>{formatCurrency(dre.cost_ipva)}</span>
                    </div>
                  )}
                  {dre.cost_transferencia > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Transferência</span>
                      <span>{formatCurrency(dre.cost_transferencia)}</span>
                    </div>
                  )}
                  {dre.cost_frete > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Frete</span>
                      <span>{formatCurrency(dre.cost_frete)}</span>
                    </div>
                  )}
                  {dre.cost_outros > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Outros</span>
                      <span>{formatCurrency(dre.cost_outros)}</span>
                    </div>
                  )}
                  {dre.total_real_costs === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum custo registrado
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Alertas e Indicadores */}
              <Card>
                <CardHeader>
                  <CardTitle>Indicadores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dias em Estoque */}
                  <div className={`p-3 rounded-lg ${isOverdue ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${isOverdue ? 'text-destructive' : ''}`} />
                      <span className="font-medium">Dias em Estoque</span>
                    </div>
                    <p className={`text-2xl font-bold ${isOverdue ? 'text-destructive' : ''}`}>
                      {dre.days_in_stock} dias
                      {dre.expected_sale_days && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {' '}/ meta: {dre.expected_sale_days} dias
                        </span>
                      )}
                    </p>
                    {isOverdue && (
                      <p className="text-sm text-destructive mt-1">
                        ⚠️ Acima do tempo esperado
                      </p>
                    )}
                  </div>

                  {/* Variação de Custos */}
                  {dre.total_estimated_costs > 0 && (
                    <div className={`p-3 rounded-lg ${costVariance > 0 ? 'bg-destructive/10' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${costVariance > 0 ? 'text-destructive' : 'text-green-600'}`} />
                        <span className="font-medium">Custos vs Estimado</span>
                      </div>
                      <p className={`text-lg font-bold ${costVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {costVariance > 0 ? '+' : ''}{formatCurrency(costVariance)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Real: {formatCurrency(dre.total_real_costs)} / Estimado: {formatCurrency(dre.total_estimated_costs)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Dados de DRE não disponíveis
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="costs" className="space-y-4 mt-4">
          {isManager && (
            <Dialog open={isCostDialogOpen} onOpenChange={(open) => {
              setIsCostDialogOpen(open);
              if (!open) setEditingCost(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Custo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCost ? 'Editar Custo' : 'Adicionar Custo'}</DialogTitle>
                </DialogHeader>
                <VehicleCostForm
                  vehicleId={vehicle.id}
                  onSubmit={handleAddCost}
                  isLoading={createCost.isPending || updateCost.isPending}
                  editingCost={editingCost}
                  onCancelEdit={() => { setEditingCost(null); setIsCostDialogOpen(false); }}
                />
              </DialogContent>
            </Dialog>
          )}

          {costsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : costs && costs.length > 0 ? (
            <div className="space-y-2">
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {vehicleCostTypeLabels[cost.cost_type]}
                      </Badge>
                      <span className="font-medium">{cost.description}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(cost.cost_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {formatCurrency(cost.amount)}
                    </span>
                    {isManager && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEditCost(cost)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir custo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCost.mutate({ id: cost.id, vehicleId: vehicle.id })}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum custo registrado para este veículo
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
