import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, FileCheck, CreditCard, Car, CheckCircle, MapPin, Clock, Phone, ArrowRight, ExternalLink } from 'lucide-react';
import { LocationMap } from '@/components/ui/expand-map';
import logoImg from '@/assets/logo-matheus-veiculos.png';

// Smooth animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8 }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.8 }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.8 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.8 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6 }
  }
};

export default function Sobre() {
  const openGoogleMaps = () => {
    window.open(
      "https://www.google.com/maps/search/?api=1&query=Av.+Maj.+Joaquim+Monteiro+Patto,+25+-+Chácara+do+Visconde,+Taubaté+-+SP,+12050-620",
      "_blank"
    );
  };

  return (
    <div className="bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black z-10" />
          <motion.div 
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: "linear" }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-20">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.span 
              className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Conheça nossa história
            </motion.span>
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6 font-['Oswald']"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              Sobre a <span className="text-[#E53935]">Matheus Veículos</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Quase 20 anos de tradição no Vale do Paraíba
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-0 right-0 w-96 h-96 bg-[#E53935]/10 rounded-full blur-[150px]"
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
            {/* Image side */}
            <motion.div
              className="relative"
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="relative rounded-3xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1200&q=80" 
                  alt="Showroom Matheus Veículos" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Stats cards */}
              <motion.div 
                className="absolute -bottom-6 -right-6 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="text-4xl font-bold text-[#E53935] mb-1">20</div>
                <div className="text-white/50 text-sm">Anos de<br />Experiência</div>
              </motion.div>

              <motion.div 
                className="absolute -top-6 -left-6 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="text-4xl font-bold text-[#E53935] mb-1">100%</div>
                <div className="text-white/50 text-sm">Laudo<br />Aprovado</div>
              </motion.div>
            </motion.div>

            {/* Content side */}
            <motion.div
              variants={fadeInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
                Nossa História
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight font-['Oswald']">
                Tradição e Confiança<br />
                <span className="text-white/50">no Vale do Paraíba</span>
              </h2>
              
              <div className="space-y-4 text-white/60 text-lg leading-relaxed">
                <p>
                  A Matheus Veículos é uma loja especializada em compra, venda e troca de carros seminovos em Taubaté, com quase 20 anos de experiência no mercado automotivo do Vale do Paraíba.
                </p>
                <p>
                  Ao longo dessa trajetória, construímos uma reputação sólida baseada em confiança, transparência e qualidade, valores que fazem parte de cada negociação realizada em nossa loja.
                </p>
                <p>
                  Nossa missão sempre foi clara: oferecer veículos seminovos de procedência, com histórico confiável e total segurança para quem compra. Todos os nossos carros passam por avaliação criteriosa e contam com laudo cautelar 100% aprovado, garantindo tranquilidade e credibilidade do primeiro contato até a entrega do veículo.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Atendimento Transparente */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E53935]/5 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
              Nosso Compromisso
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white font-['Oswald']">
              Atendimento Transparente e<br />
              <span className="text-white/50">Negociação Segura</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-6"
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <p className="text-white/60 text-lg leading-relaxed">
                Na Matheus Veículos, acreditamos que comprar um carro deve ser uma experiência simples e sem dores de cabeça. Por isso, oferecemos um atendimento personalizado, rápido e direto, respeitando o perfil e a necessidade de cada cliente.
              </p>
              <p className="text-white/60 text-lg leading-relaxed">
                Nosso time está preparado para orientar você em todas as etapas do processo, esclarecendo dúvidas e apresentando as melhores opções do mercado.
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {[
                { icon: CreditCard, title: 'Financiamento Bancário', desc: 'Aprovação rápida com as melhores taxas' },
                { icon: CreditCard, title: 'Cartão de Crédito', desc: 'Flexibilidade no pagamento' },
                { icon: Car, title: 'Troca de Veículos', desc: 'Aceitamos carro ou moto como parte' },
                { icon: FileCheck, title: 'Documentação na Hora', desc: 'Entrega imediata dos documentos' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="group p-6 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl hover:border-[#E53935]/30 transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center mb-4 group-hover:bg-[#E53935] group-hover:border-[#E53935] transition-all">
                    <item.icon className="w-6 h-6 text-[#E53935] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Garantia de Procedência */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
                Qualidade Garantida
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-['Oswald']">
                Seminovos Revisados e<br />
                <span className="text-white/50">Garantia de Procedência</span>
              </h2>
              
              <div className="space-y-4 text-white/60 text-lg leading-relaxed mb-8">
                <p>
                  Cada veículo disponível em nosso estoque é selecionado com rigor. Antes de chegar até você, passa por revisão técnica, análise documental e verificação completa de procedência.
                </p>
                <p>
                  Isso garante que nossos clientes encontrem carros seminovos confiáveis em Taubaté, prontos para rodar e com excelente custo-benefício.
                </p>
              </div>

              <motion.div 
                className="space-y-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
              >
                {[
                  'Revisão Técnica Completa',
                  'Análise Documental Detalhada',
                  'Verificação de Procedência',
                  'Laudo Cautelar 100% Aprovado',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3"
                    variants={staggerItem}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E53935]/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-[#E53935]" />
                    </div>
                    <span className="text-white font-medium">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              className="relative"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Quote card */}
              <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-10 overflow-hidden">
                <motion.div 
                  className="absolute top-0 right-0 w-40 h-40 bg-[#E53935]/20 rounded-full blur-3xl"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 1 }}
                />
                
                <img src={logoImg} alt="Matheus Veículos" className="h-12 mb-8" />
                
                <blockquote className="text-2xl text-white/80 font-light italic leading-relaxed mb-6">
                  "Mais do que vender carros, nosso compromisso é construir relacionamentos duradouros, baseados na honestidade e na confiança. É essa postura que faz da Matheus Veículos uma referência em carros seminovos no Vale do Paraíba."
                </blockquote>

                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-10 h-0.5 bg-[#E53935]"
                    initial={{ width: 0 }}
                    whileInView={{ width: 40 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  />
                  <span className="text-[#E53935] font-medium">Equipe Matheus Veículos</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visite Nossa Loja */}
      <section className="py-24 bg-black relative">
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#E53935]/10 rounded-full blur-[150px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="text-[#E53935] text-sm font-medium uppercase tracking-widest mb-4 block">
              Venha nos visitar
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white font-['Oswald']">
              Visite a Matheus Veículos<br />
              <span className="text-white/50">em Taubaté</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Info side */}
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                Se você busca comprar, vender ou trocar seu carro em Taubaté, venha conhecer a Matheus Veículos. Nossa loja física está localizada em um ponto de fácil acesso, pronta para receber você com conforto e atendimento de qualidade.
              </p>

              <motion.div 
                className="space-y-6 mb-8"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
              >
                <motion.div variants={staggerItem} className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#E53935]" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Endereço</h4>
                    <p className="text-white/50">
                      Avenida Major Joaquim Monteiro Patto, 25<br />
                      Chácara do Visconde - Taubaté/SP<br />
                      CEP: 12050-620
                    </p>
                  </div>
                </motion.div>
                
                <motion.div variants={staggerItem} className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-[#E53935]" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Horário de Funcionamento</h4>
                    <div className="text-white/50 space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Segunda a Sexta: 08:00 às 18:00
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Sábado: 08:00 às 12:30
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Domingo: Fechado
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div variants={staggerItem} className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-[#E53935]" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1">Telefone</h4>
                    <p className="text-white/50">(12) 98897-3547 (Atendimento)</p>
                    <p className="text-white/50">(12) 99668-1249 (Escritório)</p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.button 
                onClick={openGoogleMaps}
                className="flex items-center gap-3 px-8 py-4 bg-[#E53935] text-white font-semibold rounded-full hover:shadow-[0_0_30px_rgba(229,57,53,0.4)] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ExternalLink className="w-5 h-5" />
                Abrir no Google Maps
              </motion.button>
            </motion.div>

            {/* Map side */}
            <motion.div
              className="flex justify-center"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <LocationMap className="w-full max-w-lg" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tagline Final */}
      <section className="py-24 bg-zinc-950 relative overflow-hidden">
        {/* Red accent glow */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#E53935]/10 rounded-full blur-[150px]"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.img 
              src={logoImg} 
              alt="Matheus Veículos" 
              className="h-16 mx-auto mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            />
            
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight font-['Oswald']">
              Matheus Veículos.<br />
              <span className="text-[#E53935]">Tradição, segurança e confiança</span><br />
              <span className="text-white/50">na hora de comprar seu próximo carro seminovo.</span>
            </h2>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={staggerItem}>
                <Link to="/veiculos">
                  <motion.button 
                    className="px-10 py-5 bg-[#E53935] text-white font-bold rounded-full hover:shadow-[0_0_40px_rgba(229,57,53,0.4)] transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Ver Estoque
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Link to="/contato">
                  <motion.button 
                    className="px-10 py-5 border-2 border-white/20 text-white font-bold rounded-full hover:bg-white/10 hover:border-white/40 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Fale Conosco
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
