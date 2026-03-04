import { Car, MoreHorizontal, Globe, EyeOff, Bike } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Vehicle, VehicleType } from '@/types/inventory';
import { vehicleStatusLabels, vehicleStatusColors, fuelTypeLabels } from '@/types/inventory';
import { useUpdateVehicle } from '@/hooks/useVehicles';
import { useToggleVehiclePortal } from '@/hooks/usePortalSettings';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicle: Vehicle) => void;
  enabledPortals?: string[];
}

const PORTAL_CONFIG: Record<string, { label: string; bg: string; text: string; abbr: string; field: 'portal_ml' | 'portal_np' }> = {
  mercadolivre: { label: 'Mercado Livre', bg: 'bg-[#FFE600]', text: 'text-black', abbr: 'ML', field: 'portal_ml' },
  napista: { label: 'Napista', bg: 'bg-[#1a1a2e]', text: 'text-white', abbr: 'NP', field: 'portal_np' },
};

export function VehicleTable({ vehicles, onVehicleClick, enabledPortals = [] }: VehicleTableProps) {
  const updateVehicle = useUpdateVehicle();
  const toggleVehiclePortal = useToggleVehiclePortal();

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatKm = (km: number) => {
    return new Intl.NumberFormat('pt-BR').format(km) + ' km';
  };

  const handleToggleType = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    const newType: VehicleType = vehicle.vehicle_type === 'carro' ? 'moto' : 'carro';
    updateVehicle.mutate({ id: vehicle.id, vehicle_type: newType });
  };

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Car className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum veículo encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Tipo</TableHead>
            <TableHead className="w-[280px]">Veículo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>KM</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead className="text-right">Preço Venda</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Site</TableHead>
            {enabledPortals.length > 0 && <TableHead className="text-center">Portais</TableHead>}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              className="cursor-pointer"
              onClick={() => onVehicleClick(vehicle)}
            >
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleToggleType(e, vehicle)}
                      disabled={updateVehicle.isPending}
                    >
                      {vehicle.vehicle_type === 'moto' ? (
                        <Bike className="h-5 w-5 text-primary" />
                      ) : (
                        <Car className="h-5 w-5 text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Clique para alternar para {vehicle.vehicle_type === 'carro' ? 'Moto' : 'Carro'}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <img 
                      src={vehicle.images[0]} 
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="p-2 bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                    {vehicle.version && (
                      <p className="text-sm text-muted-foreground">{vehicle.version}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{vehicle.year_fabrication}/{vehicle.year_model}</TableCell>
              <TableCell>{formatKm(vehicle.km)}</TableCell>
              <TableCell className="font-mono">{vehicle.plate || '-'}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(vehicle.sale_price)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(vehicle.purchase_price)}
              </TableCell>
              <TableCell>
                <Badge className={vehicleStatusColors[vehicle.status]}>
                  {vehicleStatusLabels[vehicle.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center">
                      {vehicle.featured ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {vehicle.featured ? 'Visível no site' : 'Não visível no site'}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              {enabledPortals.length > 0 && (
                <TableCell>
                  <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {enabledPortals.map((portalId) => {
                      const cfg = PORTAL_CONFIG[portalId];
                      if (!cfg) return null;
                      const isActive = vehicle[cfg.field];
                      return (
                        <Tooltip key={portalId}>
                          <TooltipTrigger asChild>
                            <button
                              className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all border-2 ${
                                isActive
                                  ? `${cfg.bg} ${cfg.text} border-transparent ring-2 ring-green-500`
                                  : `${cfg.bg} ${cfg.text} border-transparent opacity-30 hover:opacity-80`
                              }`}
                              onClick={() => {
                                window.open('http://amodolo82-004-site5.jtempurl.com/index.html#!/vehiclead/2', '_blank');
                              }}
                            >
                              {cfg.abbr}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isActive ? `Desmarcar ${cfg.label}` : `Marcar ${cfg.label}`}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onVehicleClick(vehicle);
                    }}>
                      Ver detalhes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
