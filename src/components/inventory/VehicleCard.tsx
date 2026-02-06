import { Car, Calendar, Gauge, Fuel, ImageOff, Bike } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Vehicle } from '@/types/inventory';
import { vehicleStatusLabels, vehicleStatusColors, fuelTypeLabels } from '@/types/inventory';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const [imageError, setImageError] = useState(false);
  
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

  // Pegar a primeira imagem do veículo
  const coverImage = vehicle.images && vehicle.images.length > 0 && !imageError
    ? vehicle.images[0]
    : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      {/* Capa do Veículo */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            {vehicle.vehicle_type === 'moto' ? (
              <Bike className="h-12 w-12 opacity-30" />
            ) : (
              <Car className="h-12 w-12 opacity-30" />
            )}
            <span className="text-xs mt-1">Sem foto</span>
          </div>
        )}
        
        {/* Badge de status no canto */}
        <div className="absolute top-2 right-2">
          <Badge className={vehicleStatusColors[vehicle.status]}>
            {vehicleStatusLabels[vehicle.status]}
          </Badge>
        </div>
        
        {/* Overlay de preço */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-white font-bold text-lg">
            {formatCurrency(vehicle.sale_price)}
          </p>
        </div>
      </div>

      <CardContent className="pt-3 pb-4 space-y-2">
        {/* Título */}
        <div>
          <h3 className="font-semibold text-base leading-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          {vehicle.version && (
            <p className="text-sm text-muted-foreground truncate">{vehicle.version}</p>
          )}
        </div>

        {/* Informações */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{vehicle.year_fabrication}/{vehicle.year_model}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3 w-3" />
            <span>{formatKm(vehicle.km)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Fuel className="h-3 w-3" />
            <span>{fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}</span>
          </div>
          {vehicle.plate && (
            <div className="font-mono text-xs">
              {vehicle.plate}
            </div>
          )}
        </div>

        {/* Custo (se disponível) */}
        {vehicle.purchase_price && (
          <div className="pt-2 border-t text-sm flex justify-between items-center">
            <span className="text-muted-foreground">Custo:</span>
            <span className="font-medium">{formatCurrency(vehicle.purchase_price)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
