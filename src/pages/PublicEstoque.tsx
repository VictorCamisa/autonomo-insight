import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { usePublicVehicles } from '@/hooks/usePublicVehicles';
import { PublicVehicleCard } from '@/components/public/PublicVehicleCard';

export default function PublicEstoque() {
  const { data: vehicles, isLoading } = usePublicVehicles();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const filteredVehicles = vehicles?.filter(v => {
    const searchLower = search.toLowerCase();
    return (
      v.brand.toLowerCase().includes(searchLower) ||
      v.model.toLowerCase().includes(searchLower) ||
      (v.version?.toLowerCase().includes(searchLower))
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return (a.sale_price || 0) - (b.sale_price || 0);
      case 'price-desc': return (b.sale_price || 0) - (a.sale_price || 0);
      case 'year-desc': return b.year_model - a.year_model;
      case 'km-asc': return a.km - b.km;
      default: return 0;
    }
  });

  return (
    <div className="bg-black min-h-screen pt-20">
      {/* Header */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="container mx-auto px-6">
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Nosso <span className="text-[#E53935]">Estoque</span>
          </motion.h1>
          <motion.p
            className="text-white/50 text-center mt-4 max-w-xl mx-auto text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Encontre o veículo perfeito para você
          </motion.p>
        </div>
      </section>

      {/* Search & Sort Bar */}
      <section className="sticky top-[64px] z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                placeholder="Buscar por marca, modelo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-12 h-12 bg-zinc-900 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-white/30 hover:text-white" />
                </button>
              )}
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-52 h-12 bg-zinc-900 border-white/5 text-white rounded-xl">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="recent" className="text-white focus:bg-zinc-800 focus:text-white">Mais recentes</SelectItem>
                  <SelectItem value="price-asc" className="text-white focus:bg-zinc-800 focus:text-white">Menor preço</SelectItem>
                  <SelectItem value="price-desc" className="text-white focus:bg-zinc-800 focus:text-white">Maior preço</SelectItem>
                  <SelectItem value="year-desc" className="text-white focus:bg-zinc-800 focus:text-white">Ano mais novo</SelectItem>
                  <SelectItem value="km-asc" className="text-white focus:bg-zinc-800 focus:text-white">Menor KM</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 border-white/5 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white rounded-xl"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicle Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl h-[420px] animate-pulse" />
              ))}
            </div>
          ) : filteredVehicles && filteredVehicles.length > 0 ? (
            <>
              <p className="text-white/40 mb-6 text-sm">{filteredVehicles.length} veículo(s) encontrado(s)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle, index) => (
                  <PublicVehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-white/40 text-lg">Nenhum veículo encontrado.</p>
              {search && (
                <Button variant="link" onClick={() => setSearch('')} className="text-[#E53935] mt-2">
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
