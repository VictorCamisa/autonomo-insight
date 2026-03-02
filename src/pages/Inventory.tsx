import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, BarChart3, Car, CheckCircle, Clock, Wrench, DollarSign, Upload, Store, Eye, Bike, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleCard } from '@/components/inventory/VehicleCard';
import { VehicleDRECard } from '@/components/inventory/VehicleDRECard';
import { VehicleTable } from '@/components/inventory/VehicleTable';
import { CreateVehicleDialog } from '@/components/inventory/CreateVehicleDialog';
import { MercadoLivreConfigDialog } from '@/components/inventory/MercadoLivreConfigDialog';
import { BentoCard } from '@/components/ui/bento-card';
import { useVehicles, useAllVehicleDRE, useCreateVehicle, useBulkUpdateVehiclesVisibility } from '@/hooks/useVehicles';
import { usePermissions } from '@/hooks/usePermissions';
import type { Vehicle, VehicleStatus, VehicleDRE, VehicleType } from '@/types/inventory';
import { vehicleStatusLabels, vehicleTypeLabels } from '@/types/inventory';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'grid' | 'table' | 'dre';

export default function Inventory() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMercadoLivreDialogOpen, setIsMercadoLivreDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('disponivel');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const navigate = useNavigate();
  const { role } = useAuth();

  const { data: vehicles, isLoading } = useVehicles();
  const { data: dreData, isLoading: dreLoading } = useAllVehicleDRE();
  const createVehicle = useCreateVehicle();
  const bulkUpdateVisibility = useBulkUpdateVehiclesVisibility();

  const isManager = role === 'gerente';

  const filteredVehicles = vehicles?.filter((vehicle) => {
    const matchesSearch =
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
      const matchesType = vehicleTypeFilter === 'all' || vehicle.vehicle_type === vehicleTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    }) || [];

  const filteredDRE = (Array.isArray(dreData) ? dreData : []).filter((dre) => {
    const matchesSearch =
      dre.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dre.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dre.plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || dre.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) as VehicleDRE[];

  const handleCreateVehicle = (data: Parameters<typeof createVehicle.mutate>[0]) => {
    createVehicle.mutate(data, {
      onSuccess: () => setIsCreateDialogOpen(false),
    });
  };

  const handleVehicleClick = (vehicle: Vehicle | VehicleDRE) => {
    navigate(`/estoque/${vehicle.id}`);
  };

  // Stats
  const stats = {
    total: vehicles?.length || 0,
    disponivel: vehicles?.filter(v => v.status === 'disponivel').length || 0,
    reservado: vehicles?.filter(v => v.status === 'reservado').length || 0,
    emManutencao: vehicles?.filter(v => v.status === 'em_manutencao').length || 0,
  };

  // Calcular valor total em estoque
  const totalStockValue = vehicles?.reduce((sum, v) => sum + (v.sale_price || 0), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            Gestão completa do inventário de veículos
          </p>
        </div>

        {isManager && (
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => bulkUpdateVisibility.mutate(true)}
              disabled={bulkUpdateVisibility.isPending}
              className="border-green-500/50 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Eye className="h-4 w-4 mr-2 text-green-600" />
              {bulkUpdateVisibility.isPending ? 'Atualizando...' : 'Exibir Todos no Site'}
            </Button>
            <Link to="/estoque/exportar-alm">
              <Button variant="outline" size="lg" className="border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Exportar ALM
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setIsMercadoLivreDialogOpen(true)}
              className="border-yellow-500/50 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            >
              <Store className="h-4 w-4 mr-2 text-yellow-600" />
              Mercado Livre
            </Button>
            <Link to="/estoque/importar">
              <Button variant="outline" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Importar XML
              </Button>
            </Link>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards with BentoCards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <BentoCard
          title="Total em Estoque"
          value={stats.total}
          subtitle="Veículos cadastrados"
          colors={["#E53935", "#EF5350", "#E57373"]}
          delay={0}
          icon={<Car className="h-5 w-5 text-muted-foreground" />}
        />
        <BentoCard
          title="Disponíveis"
          value={stats.disponivel}
          subtitle="Prontos para venda"
          colors={["#D32F2F", "#E53935", "#EF5350"]}
          delay={0.1}
          icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
        />
        <BentoCard
          title="Reservados"
          value={stats.reservado}
          subtitle="Em negociação"
          colors={["#C62828", "#D32F2F", "#E53935"]}
          delay={0.2}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
        />
        <BentoCard
          title="Em Manutenção"
          value={stats.emManutencao}
          subtitle="Aguardando reparo"
          colors={["#B71C1C", "#C62828", "#D32F2F"]}
          delay={0.3}
          icon={<Wrench className="h-5 w-5 text-muted-foreground" />}
        />
        <BentoCard
          title="Valor em Estoque"
          value={formatCurrency(totalStockValue)}
          subtitle="Preço de venda"
          colors={["#E53935", "#EF5350", "#E57373"]}
          delay={0.4}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select 
            value={vehicleTypeFilter} 
            onValueChange={(value) => setVehicleTypeFilter(value as VehicleType | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    {value === 'carro' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={statusFilter} 
            onValueChange={(value) => setStatusFilter(value as VehicleStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(vehicleStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="dre" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">DRE</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading || dreLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : viewMode === 'table' ? (
        <VehicleTable 
          vehicles={filteredVehicles} 
          onVehicleClick={handleVehicleClick}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onClick={() => handleVehicleClick(vehicle)}
            />
          ))}
          {filteredVehicles.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum veículo encontrado</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDRE.map((dre) => (
            <VehicleDRECard
              key={dre.id}
              dre={dre}
              onClick={() => handleVehicleClick(dre)}
            />
          ))}
          {filteredDRE.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum DRE encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreateVehicleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateVehicle}
        isLoading={createVehicle.isPending}
      />

      {/* Mercado Livre Config Dialog */}
      <MercadoLivreConfigDialog
        open={isMercadoLivreDialogOpen}
        onOpenChange={setIsMercadoLivreDialogOpen}
      />
    </div>
  );
}
