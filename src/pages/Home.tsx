import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Shield, Clock, Award, MapPin, Phone, ChevronRight, Search } from 'lucide-react';
import { usePublicVehicles } from '@/hooks/usePublicVehicles';
import { PublicVehicleCard } from '@/components/public/PublicVehicleCard';
import logoImg from '@/assets/logo-matheus-veiculos.png';
import heroBanner from '@/assets/hero-banner.png';
import lojaFachada1 from '@/assets/loja-fachada-1.jpg';
import lojaFachada2 from '@/assets/loja-fachada-2.jpg';
import lojaInterior from '@/assets/loja-interior.jpg';

const sectionVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.97 },
  visible: { 
    opacity: 1, y: 0, scale: 1, 
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } 
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } }
};

export default function Home() {
  const { data: allVehicles, isLoading: loadingAll } = usePublicVehicles();

  const openWhatsApp = () => {
    window.open('https://wa.me/5512988973547?text=Olá! Vim pelo site e gostaria de mais informações.', '_blank');
  };

  // Separar veículos com foto: 6 destaque + 4 recentes
  const vehiclesWithPhotos = allVehicles?.filter(v => v.images && v.images.length > 0) || [];
  const featuredVehicles = vehiclesWithPhotos.slice(0, 6);
  const recentVehicles = vehiclesWithPhotos.slice(6, 10);

  return (
    <div className="text-foreground">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative w-full overflow-hidden h-screen flex flex-col justify-end">
        <div className="absolute inset-0">
          <img src={heroBanner} alt="Matheus Veículos" className="w-full h-full object-cover brightness-[0.5]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent h-1/3" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]" />
        </div>

        {/* Logo overlay */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-10">
          <motion.img 
            src={logoImg} 
            alt="Matheus Veículos" 
            className="h-24 md:h-40 w-auto drop-shadow-2xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 md:pb-12">
          <motion.div
            className="container mx-auto px-5 md:px-6 flex flex-col items-center text-center gap-5 md:gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <motion.p
              className="text-white/70 text-[11px] md:text-sm tracking-[0.25em] md:tracking-[0.3em] uppercase font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Tradição em cada detalhe
            </motion.p>

            <div className="flex gap-3 w-full max-w-sm md:max-w-none md:w-auto">
              <Link to="/veiculos" className="flex-1 md:flex-none">
                <motion.button
                  className="group w-full px-5 md:px-7 py-3 bg-white/10 backdrop-blur-xl border border-white/15 text-white font-medium rounded-xl hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-black/30"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Search className="w-4 h-4" />
                  Ver Estoque
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </Link>
              <motion.button
                onClick={openWhatsApp}
                className="flex-1 md:flex-none px-5 md:px-7 py-3 bg-primary/80 backdrop-blur-xl border border-primary/40 text-primary-foreground font-medium rounded-xl hover:bg-primary transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-black/30"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.682-1.415A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.332-.726-6.033-1.96l-.424-.318-2.791.843.771-2.817-.34-.448A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                WhatsApp
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ VEÍCULOS EM DESTAQUE ═══════════ */}
      <motion.section 
        className="pt-10 pb-10 md:pt-20 md:pb-24 relative overflow-hidden bg-background"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-10 gap-3"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div>
              <span className="text-accent text-xs font-semibold uppercase tracking-[0.2em] mb-1.5 block">
                ★ Destaques
              </span>
              <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground">
                Veículos em <span className="text-accent">Destaque</span>
              </h2>
            </div>
            <Link to="/veiculos" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
              Ver estoque completo
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {loadingAll ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl h-[280px] md:h-[420px] animate-pulse" />
              ))}
            </div>
          ) : featuredVehicles && featuredVehicles.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {featuredVehicles.map((vehicle, index) => (
                <motion.div key={vehicle.id} variants={staggerItem}>
                  <PublicVehicleCard vehicle={vehicle} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhum veículo em destaque no momento.</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ═══════════ ACABOU DE CHEGAR ═══════════ */}
      {recentVehicles.length > 0 && (
        <motion.section 
          className="py-10 md:py-24 relative overflow-hidden bg-background"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="absolute inset-0">
            <img src={lojaFachada1} alt="" className="w-full h-full object-cover opacity-[0.03]" />
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[200px] pointer-events-none" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <motion.div
              className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-10 gap-3"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <div>
                <span className="text-accent text-xs font-semibold uppercase tracking-[0.2em] mb-1.5 block">
                  Novidades
                </span>
                <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground">
                  Acabou de <span className="text-primary">Chegar</span>
                </h2>
              </div>
              <Link to="/veiculos" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                Ver todos
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {recentVehicles.map((vehicle, index) => (
                <motion.div key={vehicle.id} variants={staggerItem}>
                  <PublicVehicleCard vehicle={vehicle} index={index} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* ═══════════ DIFERENCIAIS ═══════════ */}
      <motion.section 
        className="py-10 md:py-16 relative overflow-hidden"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="absolute inset-0">
          <img src={lojaInterior} alt="" className="w-full h-full object-cover opacity-[0.03]" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { icon: Shield, title: 'Laudo Aprovado', desc: 'Todos os veículos com laudo cautelar 100% aprovado e histórico verificado.' },
              { icon: Clock, title: 'Documentação na Hora', desc: 'Agilidade total. Documentação completa entregue no ato da compra.' },
              { icon: Award, title: 'Facilidade de Pagamento', desc: 'Financiamento, cartão e aceitamos seu carro ou moto como parte.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="group relative bg-card border border-border rounded-2xl p-5 md:p-7 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary transition-all duration-300">
                  <item.icon className="w-5 h-5 md:w-6 md:h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-foreground font-semibold text-base mb-1.5 md:mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════ CTA + CONTATO ═══════════ */}
      <motion.section 
        className="py-12 md:py-20 relative overflow-hidden"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-3 md:mb-4">
                Encontre seu carro{' '}
                <span className="text-primary">ideal</span>
              </h2>
              <p className="text-white/60 mb-6 md:mb-8 max-w-md text-sm md:text-base leading-relaxed">
                Visite nosso estoque online ou entre em contato pelo WhatsApp. Atendimento rápido e sem burocracia.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/veiculos">
                  <motion.button
                    className="w-full sm:w-auto px-6 md:px-7 py-3 md:py-3.5 bg-primary text-primary-foreground font-semibold rounded-full hover:brightness-110 transition-all text-sm"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Ver Estoque Completo
                  </motion.button>
                </Link>
                <motion.button
                  onClick={openWhatsApp}
                  className="w-full sm:w-auto px-6 md:px-7 py-3 md:py-3.5 border border-white/20 text-white font-medium rounded-full hover:bg-white/10 transition-all text-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Falar pelo WhatsApp
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              className="space-y-4 md:space-y-5 bg-white/5 backdrop-blur-sm rounded-2xl p-5 md:p-7 border border-white/10"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { icon: MapPin, label: 'Av. Maj. Joaquim M. Patto, 25 — Chácara do Visconde, Taubaté/SP' },
                { icon: Clock, label: 'Seg–Sex: 08h–18h · Sáb: 08h–12h30' },
                { icon: Phone, label: '(12) 98897-3547', action: openWhatsApp },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="flex items-center gap-3 md:gap-4 group cursor-pointer"
                  onClick={item.action}
                >
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all flex-shrink-0">
                    <item.icon className="w-4 h-4 text-white/60 group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <span className="text-white/80 text-sm md:text-base group-hover:text-white transition-colors">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
