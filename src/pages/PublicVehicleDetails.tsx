import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Gauge, Fuel, Settings2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicVehicle } from '@/hooks/usePublicVehicles';
import { fuelTypeLabels, transmissionLabels } from '@/types/inventory';

export default function PublicVehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: vehicle, isLoading, error } = usePublicVehicle(id || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const formatPrice = (price: number | null) => {
    if (!price) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(price);
  };

  const formatKm = (km: number) => new Intl.NumberFormat('pt-BR').format(km) + ' km';

  if (isLoading) {
    return (
      <div className="bg-public-bg min-h-screen pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-[400px] bg-public-muted rounded-xl" />
            <div className="h-8 bg-public-muted rounded w-1/3" />
            <div className="h-6 bg-public-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-public-bg min-h-screen pt-24">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-public-fg mb-4">Veículo não encontrado</h1>
          <Link to="/veiculos">
            <Button className="bg-public-primary hover:bg-public-primary-dark text-white">
              Voltar ao estoque
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedImage = vehicle.images[selectedImageIndex] || vehicle.images[0];

  const goToPrevious = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedImageIndex((prev) => (prev === vehicle.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-public-bg min-h-screen pt-24">
      <div className="container mx-auto px-4 py-8">
        <Link to="/estoque" className="inline-flex items-center text-public-fg/60 hover:text-public-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao estoque
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-public-muted mb-4 group">
              {selectedImage ? (
                <img src={selectedImage.image_url} alt={vehicle.model} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-public-fg/30">
                  <Settings2 className="h-16 w-16" />
                </div>
              )}
              {vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                    {selectedImageIndex + 1} / {vehicle.images.length}
                  </div>
                </>
              )}
            </div>
            {vehicle.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {vehicle.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`aspect-square rounded-lg overflow-hidden bg-public-muted ring-2 transition-all ${
                      i === selectedImageIndex ? 'ring-public-primary' : 'ring-transparent hover:ring-public-primary/50'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-public-primary font-semibold uppercase tracking-wide">{vehicle.brand}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-public-fg font-['Oswald'] mb-2">
              {vehicle.model}
              {vehicle.version && <span className="font-normal text-public-fg/60 text-xl ml-2">{vehicle.version}</span>}
            </h1>
            <p className="text-4xl font-bold text-public-primary mt-4 mb-6">{formatPrice(vehicle.sale_price)}</p>

            <div className="grid grid-cols-2 gap-4 p-6 bg-public-surface rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-public-primary" />
                <div>
                  <p className="text-xs text-public-fg/50">Ano</p>
                  <p className="font-semibold text-public-fg">{vehicle.year_fabrication}/{vehicle.year_model}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-public-primary" />
                <div>
                  <p className="text-xs text-public-fg/50">Quilometragem</p>
                  <p className="font-semibold text-public-fg">{formatKm(vehicle.km)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Fuel className="h-5 w-5 text-public-primary" />
                <div>
                  <p className="text-xs text-public-fg/50">Combustível</p>
                  <p className="font-semibold text-public-fg">{fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-public-primary" />
                <div>
                  <p className="text-xs text-public-fg/50">Câmbio</p>
                  <p className="font-semibold text-public-fg">{transmissionLabels[vehicle.transmission] || vehicle.transmission}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`https://wa.me/5500000000000?text=Olá! Tenho interesse no ${vehicle.brand} ${vehicle.model}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white" size="lg">
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp
                </Button>
              </a>
              <Link to="/contato" className="flex-1">
                <Button variant="outline" className="w-full border-public-primary text-public-primary hover:bg-public-primary hover:text-white" size="lg">
                  Tenho Interesse
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
