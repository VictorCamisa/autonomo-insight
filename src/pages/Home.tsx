import { lazy, Suspense, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Clock, Award, MapPin, Phone, ChevronRight, FileCheck, CreditCard, ExternalLink, Car, Users, Star, Sparkles } from 'lucide-react';
import { useFeaturedVehicles, useRecentVehicles } from '@/hooks/usePublicVehicles';
import { PublicVehicleCard } from '@/components/public/PublicVehicleCard';
import { LocationMap } from '@/components/ui/expand-map';
import { StatsCard } from '@/components/ui/stats-card';
import logoImg from '@/assets/logo-matheus-veiculos.png';
import lojaInterior from '@/assets/loja-interior.jpg';
import lojaFachada1 from '@/assets/loja-fachada-1.jpg';
import lojaFachada2 from '@/assets/loja-fachada-2.jpg';
import lojaFachada3 from '@/assets/loja-fachada-3.jpg';
import lojaFachadaPrincipal from '@/assets/loja-fachada-principal.jpg';

// Ultra-fast animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

// Memoized image component for better performance
const OptimizedImage = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => (
  <img 
    src={src} 
    alt={alt} 
    className={className}
    loading="lazy"
    decoding="async"
  />
));
OptimizedImage.displayName = 'OptimizedImage';

export default function Home() {
  const { data: featuredVehicles, isLoading } = useFeaturedVehicles(6);
  const { data: recentVehicles, isLoading: isLoadingRecent } = useRecentVehicles(12);

  const openGoogleMaps = () => {
    window.open(
      "https://www.google.com/maps/search/?api=1&query=Av.+Maj.+Joaquim+Monteiro+Patto,+25+-+Chácara+do+Visconde,+Taubaté+-+SP,+12050-620",
      "_blank"
    );
  };

  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers with store image */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black z-10" />
          <div 
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{ backgroundImage: `url(${lojaFachadaPrincipal})` }}
          />
        </div>

        {/* Noise overlay */}
        <div 
          className="absolute inset-0 z-20 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative z-20 container mx-auto px-6 pt-32 md:pt-40">
          <div className="max-w-3xl ml-0 md:ml-8 lg:ml-16">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-[1.1] tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <span className="text-white">Seu próximo</span>
              <br />
              <span className="text-[#E53935]">veículo está aqui</span>
            </motion.h1>

            <motion.p
              className="text-base md:text-lg text-white/70 mb-8 max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Quase 20 anos de tradição no Vale do Paraíba. Qualidade, confiança e os melhores veículos seminovos da região.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link to="/veiculos">
                <motion.button 
                  className="group relative px-8 py-4 bg-[#E53935] text-white font-semibold rounded-full overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(229,57,53,0.4)]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Ver Estoque
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </Link>
              <Link to="/contato">
                <motion.button 
                  className="px-8 py-4 border border-white/20 text-white font-medium rounded-full backdrop-blur-sm hover:bg-white/10 hover:border-white/40 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Fale Conosco
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div 
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <motion.div className="w-1 h-2 bg-white/60 rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section - Modern Cards */}
      <section className="relative py-20 md:py-28 bg-zinc-950">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-3 block">
              Números que impressionam
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
              Nossa <span className="text-white/50">Trajetória</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard value={500} suffix="+" label="Veículos Vendidos" icon={Car} index={0} />
            <StatsCard value={20} label="Anos de Mercado" icon={Award} index={1} />
            <StatsCard value={98} suffix="%" label="Clientes Satisfeitos" icon={Users} index={2} />
            <StatsCard value={100} suffix="%" label="Laudo Aprovado" icon={Star} index={3} />
          </div>
        </div>
      </section>

      {/* Nossa Loja - Gallery Section */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#E53935]/5 rounded-full blur-[150px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
              Conheça Nossa Estrutura
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
              Nossa <span className="text-white/50">Loja</span>
            </h2>
            <p className="text-white/60 mt-4 max-w-2xl mx-auto">
              Um showroom moderno e acolhedor, preparado para oferecer a melhor experiência na escolha do seu próximo veículo.
            </p>
          </motion.div>

          {/* Gallery Grid - Layout uniforme */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {/* Imagem principal - fachada (maior) */}
            <motion.div
              variants={staggerItem}
              className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3] md:aspect-auto"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaFachadaPrincipal} 
                alt="Fachada principal Matheus Veículos"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Fachada</span>
                <p className="text-white font-semibold text-xl">Matheus Veículos</p>
                <p className="text-white/60 text-sm mt-1">Showroom completo em Taubaté</p>
              </div>
            </motion.div>

            {/* Imagem interior */}
            <motion.div
              variants={staggerItem}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3]"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaInterior} 
                alt="Interior do showroom"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Showroom</span>
                <p className="text-white font-medium">Interior da Loja</p>
              </div>
            </motion.div>

            {/* Imagem fachada lateral */}
            <motion.div
              variants={staggerItem}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3]"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaFachada1} 
                alt="Vista lateral da loja"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Estrutura</span>
                <p className="text-white font-medium">Vista Lateral</p>
              </div>
            </motion.div>

            {/* Linha inferior - 3 fotos iguais */}
            <motion.div
              variants={staggerItem}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3]"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaFachada2} 
                alt="Fachada com veículos"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Estoque</span>
                <p className="text-white font-medium">Veículos Expostos</p>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3]"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaFachada3} 
                alt="Vista panorâmica"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Panorama</span>
                <p className="text-white font-medium">Vista Completa</p>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3]"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={lojaInterior} 
                alt="Ambiente interno"
                className="w-full h-full object-cover object-right transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-[#E53935] text-xs font-medium uppercase tracking-wider">Ambiente</span>
                <p className="text-white font-medium">Atendimento</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Vehicles */}
      <section className="py-24 bg-zinc-950">
        <div className="container mx-auto px-6">
          <motion.div
            className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div>
              <motion.span 
                className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block"
                variants={fadeInUp}
              >
                Destaques
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">
                Veículos em<br />
                <span className="text-white/50">Destaque</span>
              </h2>
            </div>
            <Link to="/veiculos">
              <motion.button 
                className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                whileHover={{ x: 5 }}
              >
                Ver todo o estoque
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl h-[420px] animate-pulse" />
              ))}
            </div>
          ) : featuredVehicles && featuredVehicles.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {featuredVehicles.map((vehicle, index) => (
                <motion.div 
                  key={vehicle.id} 
                  variants={staggerItem}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                  <PublicVehicleCard vehicle={vehicle} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <p className="text-white/50 text-lg">Nenhum veículo em destaque no momento.</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section - Premium with Store Interior */}
      <section className="py-24 bg-black relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E53935]/5 via-transparent to-zinc-900/50" />
          <motion.div 
            className="absolute top-0 right-0 w-96 h-96 bg-[#E53935]/10 rounded-full blur-[120px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-800/50 rounded-full blur-[120px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3 }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
                Nossa História
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                Tradição e<br />
                <span className="text-white/50">Confiança</span>
              </h2>
              <div className="space-y-4 text-white/60 text-lg leading-relaxed mb-8">
                <p>
                  A Matheus Veículos é uma loja especializada em compra, venda e troca de carros seminovos em Taubaté, com quase 20 anos de experiência no mercado automotivo do Vale do Paraíba.
                </p>
                <p>
                  Construímos uma reputação sólida baseada em confiança, transparência e qualidade. Todos os nossos carros passam por avaliação criteriosa e contam com laudo cautelar 100% aprovado.
                </p>
              </div>
              <Link to="/sobre">
                <motion.button 
                  className="group flex items-center gap-3 text-white font-medium"
                  whileHover={{ x: 5 }}
                >
                  <span className="w-12 h-12 rounded-full border border-[#E53935]/30 bg-[#E53935]/10 flex items-center justify-center group-hover:bg-[#E53935] group-hover:border-[#E53935] transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                  Conheça nossa história
                </motion.button>
              </Link>
            </motion.div>

            <motion.div
              className="relative"
              variants={fadeInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Image with glass overlay */}
              <div className="relative rounded-3xl overflow-hidden">
                <motion.img 
                  src={lojaInterior} 
                  alt="Interior da loja Matheus Veículos"
                  className="w-full h-auto object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                {/* Quote overlay */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 p-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <img src={logoImg} alt="Matheus Veículos" className="h-8 mb-4" />
                    <blockquote className="text-white/90 font-light italic leading-relaxed">
                      "Mais do que vender carros, nosso compromisso é construir relacionamentos duradouros."
                    </blockquote>
                    <div className="flex items-center gap-2 mt-4">
                      {[1, 2, 3].map((i) => (
                        <motion.div 
                          key={i} 
                          className="w-2 h-2 rounded-full bg-[#E53935]"
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        />
                      ))}
                      <span className="text-white/50 text-sm ml-2">Referência no Vale do Paraíba</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Differentials - Premium Horizontal Layout with Enhanced Animations */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
              Diferenciais
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
              Por que nos escolher?
            </h2>
          </motion.div>

          <motion.div 
            className="space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { 
                num: '01',
                icon: Shield, 
                title: 'Procedência Garantida', 
                desc: 'Todos os veículos passam por avaliação criteriosa e contam com laudo cautelar 100% aprovado. Histórico completo e documentação verificada para sua total segurança.',
              },
              { 
                num: '02',
                icon: FileCheck, 
                title: 'Documentação na Hora', 
                desc: 'Toda a documentação é entregue na hora da compra, trazendo ainda mais segurança e agilidade para sua decisão. Processo transparente do início ao fim.',
              },
              { 
                num: '03',
                icon: CreditCard, 
                title: 'Facilidade de Pagamento', 
                desc: 'Trabalhamos com financiamento bancário, cartão de crédito e aceitamos carro ou moto como parte do negócio. As melhores condições do mercado.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="group relative bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 overflow-hidden cursor-pointer"
              >
                {/* Animated background on hover */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-[#E53935]/10 via-[#E53935]/5 to-transparent"
                  initial={{ opacity: 0, x: -100 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Hover glow */}
                <motion.div 
                  className="absolute top-0 right-0 w-64 h-64 bg-[#E53935] rounded-full blur-3xl"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.1 }}
                  transition={{ duration: 0.5 }}
                />
                
                <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                  {/* Number with animation */}
                  <motion.div 
                    className="flex-shrink-0"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-6xl md:text-7xl font-display font-bold text-white/10 group-hover:text-[#E53935]/30 transition-colors duration-500">
                      {item.num}
                    </span>
                  </motion.div>
                  
                  {/* Icon */}
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E53935] group-hover:border-[#E53935] transition-all duration-300"
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <item.icon className="w-8 h-8 text-[#E53935] group-hover:text-white transition-colors" />
                  </motion.div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <motion.h3 
                      className="text-xl md:text-2xl font-semibold text-white mb-2 group-hover:text-[#E53935] transition-colors"
                      whileHover={{ x: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.title}
                    </motion.h3>
                    <p className="text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                  
                  {/* Arrow indicator */}
                  <motion.div
                    className="hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 group-hover:border-[#E53935] group-hover:bg-[#E53935]/10 transition-all"
                    whileHover={{ scale: 1.1 }}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                  >
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-[#E53935] transition-colors" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Location Section with Interactive Map */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
                Localização
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Visite nossa<br />
                <span className="text-white/50">Loja</span>
              </h2>
              
              <motion.div 
                className="space-y-6 mb-8"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
              >
                {[
                  {
                    icon: MapPin,
                    title: 'Endereço',
                    content: <>Av. Maj. Joaquim Monteiro Patto, 25<br />Chácara do Visconde - Taubaté/SP<br />CEP: 12050-620</>
                  },
                  {
                    icon: Clock,
                    title: 'Horário de Funcionamento',
                    content: (
                      <div className="space-y-1">
                        <p>Segunda a Sexta: 08:00 às 18:00</p>
                        <p>Sábado: 08:00 às 12:30</p>
                        <p className="text-[#E53935]/70">Domingo: Fechado</p>
                      </div>
                    )
                  },
                  {
                    icon: Phone,
                    title: 'Telefone',
                    content: '(12) 3621-1234'
                  }
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    variants={staggerItem} 
                    className="flex items-start gap-4 group"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E53935] group-hover:border-[#E53935] transition-all duration-300"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <item.icon className="w-5 h-5 text-[#E53935] group-hover:text-white transition-colors" />
                    </motion.div>
                    <div>
                      <h4 className="text-white font-medium mb-1">{item.title}</h4>
                      <div className="text-white/50">{item.content}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.button 
                onClick={openGoogleMaps}
                className="flex items-center gap-3 px-6 py-3 bg-[#E53935] text-white font-medium rounded-full hover:shadow-[0_0_30px_rgba(229,57,53,0.3)] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ExternalLink className="w-5 h-5" />
                Abrir no Google Maps
              </motion.button>
            </motion.div>

            <motion.div
              className="flex justify-center"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <LocationMap />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA - Final - with Store Background */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-end">
        {/* Background with store image - positioned to show facade at top */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-top"
            style={{ backgroundImage: `url(${lojaFachada2})` }}
          />
          {/* Gradient from bottom to keep facade visible at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        </div>
        
        {/* Red accent glow - positioned at bottom */}
        <motion.div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#E53935]/15 rounded-full blur-[120px]"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        />

        <div className="container mx-auto px-6 relative z-10 text-center pb-20 pt-64">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-3xl md:text-5xl font-sans font-semibold text-white mb-4 tracking-tight">
              Pronto para encontrar{' '}
              <span className="text-[#E53935]">seu próximo carro?</span>
            </h2>
            <p className="text-white/70 text-base md:text-lg mb-8 max-w-lg mx-auto font-light">
              Visite nosso estoque online ou entre em contato. Estamos prontos para ajudar você.
            </p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={staggerItem}>
                <Link to="/veiculos">
                  <motion.button 
                    className="px-8 py-4 bg-[#E53935] text-white font-semibold rounded-full hover:shadow-[0_0_40px_rgba(229,57,53,0.4)] transition-all text-sm"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Ver Estoque Completo
                  </motion.button>
                </Link>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Link to="/contato">
                  <motion.button 
                    className="px-8 py-4 border border-white/30 text-white font-semibold rounded-full hover:bg-white/10 hover:border-white/50 transition-all text-sm"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Entrar em Contato
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
