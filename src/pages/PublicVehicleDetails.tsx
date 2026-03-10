import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Gauge, Fuel, Settings2, MessageCircle, ChevronLeft, ChevronRight, Shield, FileCheck, CreditCard } from 'lucide-react';
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
      <div className="bg-black min-h-screen pt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-[500px] bg-zinc-900 rounded-2xl" />
            <div className="h-8 bg-zinc-900 rounded w-1/3" />
            <div className="h-6 bg-zinc-900 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-black min-h-screen pt-24">
        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Veículo não encontrado</h1>
          <Link to="/veiculos">
            <Button className="bg-[#E53935] hover:bg-[#C62828] text-white">
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
    <div className="bg-black min-h-screen pt-24 text-white">
      <div className="container mx-auto px-6 py-8">
        <Link to="/veiculos" className="inline-flex items-center text-white/40 hover:text-[#E53935] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao estoque
        </Link>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 mb-4 group">
              {selectedImage ? (
                <img src={selectedImage.image_url} alt={vehicle.model} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Settings2 className="h-16 w-16" />
                </div>
              )}
              {vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full">
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
                    className={`aspect-square rounded-xl overflow-hidden bg-zinc-900 ring-2 transition-all ${
                      i === selectedImageIndex ? 'ring-[#E53935]' : 'ring-transparent hover:ring-[#E53935]/50'
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
            <p className="text-[#E53935] font-bold uppercase tracking-widest text-sm">{vehicle.brand}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
              {vehicle.model}
              {vehicle.version && <span className="font-normal text-white/40 text-xl ml-3">{vehicle.version}</span>}
            </h1>
            
            <div className="mt-4 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">A partir de</p>
              <p className="text-4xl font-bold text-white">{formatPrice(vehicle.sale_price)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6 bg-zinc-900 border border-white/5 rounded-2xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Ano</p>
                  <p className="font-semibold text-white">{vehicle.year_fabrication}/{vehicle.year_model}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">KM</p>
                  <p className="font-semibold text-white">{formatKm(vehicle.km)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <Fuel className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Combustível</p>
                  <p className="font-semibold text-white">{fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E53935]/10 flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Câmbio</p>
                  <p className="font-semibold text-white">{transmissionLabels[vehicle.transmission] || vehicle.transmission}</p>
                </div>
              </div>
            </div>

            {/* Benefits mini */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Shield, label: 'Laudo 100%' },
                { icon: FileCheck, label: 'Doc. na Hora' },
                { icon: CreditCard, label: 'Financiamento' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-white/5 rounded-xl">
                  <item.icon className="h-4 w-4 text-[#E53935] flex-shrink-0" />
                  <span className="text-xs text-white/60">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`https://wa.me/5512988973547?text=Olá! Tenho interesse no ${vehicle.brand} ${vehicle.model}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl h-14 text-base" size="lg">
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp
                </Button>
              </a>
              <Link to="/contato" className="flex-1">
                <Button variant="outline" className="w-full border-[#E53935]/30 text-[#E53935] hover:bg-[#E53935] hover:text-white rounded-xl h-14 text-base" size="lg">
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
