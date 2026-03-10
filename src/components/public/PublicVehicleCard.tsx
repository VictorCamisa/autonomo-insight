import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fuel, Gauge, Calendar, Settings2, ArrowUpRight, Zap } from 'lucide-react';
import { PublicVehicle } from '@/hooks/usePublicVehicles';
import { fuelTypeLabels, transmissionLabels } from '@/types/inventory';
import logoImg from '@/assets/logo-matheus-veiculos.png';

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
    return new Intl.NumberFormat('pt-BR').format(km);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link
        to={`/veiculos/${vehicle.id}`}
        className="group relative block rounded-2xl overflow-hidden bg-card border border-border hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.12)] transition-all duration-500"
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          {coverImage ? (
            <>
              <img
                src={coverImage.image_url}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {vehicle.featured && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    <Zap className="h-3 w-3" />
                    Destaque
                  </div>
                </div>
              )}

              <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                <div className="flex items-center gap-2.5 text-[11px] text-white/70 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {vehicle.year_fabrication}/{vehicle.year_model}
                  </span>
                  <span className="w-px h-3 bg-white/30" />
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    {formatKm(vehicle.km)} km
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-muted to-background flex flex-col items-center justify-center gap-2">
              <img
                src={logoImg}
                alt="Matheus Veículos"
                className="h-8 md:h-12 object-contain opacity-50"
              />
              <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/40">
                Em preparação
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
            {vehicle.brand}
          </span>

          <h3 className="text-foreground font-bold text-sm md:text-base mt-0.5 leading-tight group-hover:text-primary transition-colors duration-300 truncate">
            {vehicle.model}
            {vehicle.version && (
              <span className="hidden sm:inline font-normal text-muted-foreground text-xs ml-1.5">{vehicle.version}</span>
            )}
          </h3>

          <div className="hidden sm:flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
              <Fuel className="h-3 w-3" />
              {fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
              <Settings2 className="h-3 w-3" />
              {transmissionLabels[vehicle.transmission] || vehicle.transmission}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-end justify-between">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider font-medium">A partir de</p>
              <p className="text-base md:text-xl font-extrabold text-foreground tracking-tight">
                {formatPrice(vehicle.sale_price)}
              </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                Ver mais →
              </span>
            </div>
          </div>
        </div>

        <div className="h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-primary via-foreground/30 to-accent transition-all duration-700 ease-out" />
      </Link>
    </motion.div>
  );
}
