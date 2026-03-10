import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicVehicles } from '@/hooks/usePublicVehicles';
import { PublicVehicleCard } from '@/components/public/PublicVehicleCard';

export default function PublicEstoque() {
  const { data: vehicles, isLoading } = usePublicVehicles();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterFuel, setFilterFuel] = useState('all');
  const [filterTransmission, setFilterTransmission] = useState('all');

  const brands = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map(v => v.brand))].sort();
  }, [vehicles]);

  const hasActiveFilters = filterBrand !== 'all' || filterFuel !== 'all' || filterTransmission !== 'all';

  const clearFilters = () => {
    setFilterBrand('all');
    setFilterFuel('all');
    setFilterTransmission('all');
  };

  const filteredVehicles = vehicles?.filter(v => {
    // Só exibir veículos com foto
    if (!v.images || v.images.length === 0) return false;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      v.brand.toLowerCase().includes(searchLower) ||
      v.model.toLowerCase().includes(searchLower) ||
      (v.version?.toLowerCase().includes(searchLower));
    const matchesBrand = filterBrand === 'all' || v.brand === filterBrand;
    const matchesFuel = filterFuel === 'all' || v.fuel_type === filterFuel;
    const matchesTransmission = filterTransmission === 'all' || v.transmission === filterTransmission;
    return matchesSearch && matchesBrand && matchesFuel && matchesTransmission;
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
    <div className="bg-background min-h-screen pt-16 md:pt-24">
      {/* Header */}
      <section className="bg-card py-8 md:py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <motion.h1
            className="text-3xl md:text-5xl font-bold text-foreground font-['Oswald'] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Nosso <span className="text-primary">Estoque</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-center mt-2 md:mt-4 max-w-xl mx-auto text-sm md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Encontre o veículo perfeito para você
          </motion.p>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="sticky top-16 md:top-16 z-40 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm py-3 md:py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 md:pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-10 md:h-11 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 md:w-48 bg-muted border-border text-foreground h-10 text-sm">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                  <SelectItem value="year-desc">Ano mais novo</SelectItem>
                  <SelectItem value="km-asc">Menor KM</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-border bg-muted text-foreground hover:bg-muted/80 h-10 w-10 flex-shrink-0 relative ${showFilters ? 'border-primary bg-primary/10' : ''}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                )}
              </Button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                    <Select value={filterBrand} onValueChange={setFilterBrand}>
                      <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                        <SelectValue placeholder="Marca" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">Todas marcas</SelectItem>
                        {brands.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterFuel} onValueChange={setFilterFuel}>
                      <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                        <SelectValue placeholder="Combustível" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="flex">Flex</SelectItem>
                        <SelectItem value="gasolina">Gasolina</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="eletrico">Elétrico</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterTransmission} onValueChange={setFilterTransmission}>
                      <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                        <SelectValue placeholder="Câmbio" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automatico">Automático</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters && (
                    <div className="pt-2">
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Vehicle Grid */}
      <section className="py-6 md:py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted rounded-xl h-[280px] md:h-[400px] animate-pulse" />
              ))}
            </div>
          ) : filteredVehicles && filteredVehicles.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-4 md:mb-6 text-sm">{filteredVehicles.length} veículo(s) encontrado(s)</p>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {filteredVehicles.map((vehicle, index) => (
                  <PublicVehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Nenhum veículo encontrado.</p>
              {(search || hasActiveFilters) && (
                <Button variant="link" onClick={() => { setSearch(''); clearFilters(); }} className="text-primary mt-2">
                  Limpar busca e filtros
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
