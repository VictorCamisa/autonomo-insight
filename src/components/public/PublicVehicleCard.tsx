import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fuel, Gauge, Calendar, Settings2, Zap } from 'lucide-react';
import { PublicVehicle } from '@/hooks/usePublicVehicles';
import { fuelTypeLabels, transmissionLabels } from '@/types/inventory';

interface PublicVehicleCardProps {
  vehicle: PublicVehicle;
  index?: number;
}

export function PublicVehicleCard({ vehicle, index = 0 }: PublicVehicleCardProps) {
  const coverImage = vehicle.images.find(img => img.is_cover) || vehicle.images[0];
  
  const formatPrice = (price: number | null) => {
    if (!price) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatKm = (km: number) => {
    return new Intl.NumberFormat('pt-BR').format(km) + ' km';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link 
        to={`/veiculos/${vehicle.id}`}
        className="group block bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-[#E53935]/30 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(229,57,53,0.15)]"
      >
        {/* Image with overlay info */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage.image_url}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/20">
              <Settings2 className="h-16 w-16" />
            </div>
          )}
          
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Featured badge */}
          {vehicle.featured && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#E53935] text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
              <Zap className="h-3 w-3" />
              Destaque
            </div>
          )}

          {/* Year & KM overlay on image bottom */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3 text-white/90 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{vehicle.year_fabrication}/{vehicle.year_model}</span>
            </div>
            <div className="w-px h-3 bg-white/30" />
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              <span>{formatKm(vehicle.km)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Brand */}
          <p className="text-[#E53935] text-xs font-bold uppercase tracking-widest mb-1">
            {vehicle.brand}
          </p>
          
          {/* Model & Version */}
          <h3 className="text-white text-lg font-bold mb-3 group-hover:text-[#E53935] transition-colors leading-tight">
            {vehicle.model}
            {vehicle.version && (
              <span className="font-normal text-white/40 text-sm ml-2">
                {vehicle.version}
              </span>
            )}
          </h3>

          {/* Fuel & Transmission badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-white/5 rounded-full text-xs text-white/70">
              <Fuel className="h-3 w-3" />
              {fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-white/5 rounded-full text-xs text-white/70">
              <Settings2 className="h-3 w-3" />
              {transmissionLabels[vehicle.transmission] || vehicle.transmission}
            </span>
          </div>

          {/* Price */}
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
              A partir de
            </p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-white">
                {formatPrice(vehicle.sale_price)}
              </p>
              <span className="text-[#E53935] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver mais →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
