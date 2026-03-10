import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationMap } from '@/components/ui/expand-map';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Contato() {
  const openWhatsApp = () => {
    window.open('https://wa.me/5512988973547?text=Olá! Gostaria de mais informações sobre os veículos.', '_blank');
  };

  const openGoogleMaps = () => {
    window.open(
      'https://www.google.com/maps/search/?api=1&query=Av.+Major+Joaquim+Monteiro+Patto+25+Taubaté+SP',
      '_blank'
    );
  };

  return (
    <div className="bg-black min-h-screen pt-20 text-white">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Entre em <span className="text-[#E53935]">Contato</span>
            </h1>
            <p className="text-white/50 text-lg">
              Estamos prontos para atendê-lo. Visite nossa loja ou entre em contato pelos nossos canais.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <motion.div 
            className="grid md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Phone */}
            <motion.div
              className="bg-zinc-900 p-6 rounded-2xl border border-white/5 hover:border-[#E53935]/30 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-12 h-12 bg-[#E53935]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#E53935]/20 transition-colors">
                <Phone className="h-5 w-5 text-[#E53935]" />
              </div>
              <h3 className="font-semibold text-white mb-2">Telefone</h3>
              <p className="text-white/50 text-sm">(12) 98897-3547</p>
            </motion.div>

            {/* WhatsApp */}
            <motion.div
              className="bg-zinc-900 p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all duration-300 group cursor-pointer"
              variants={fadeInUp}
              onClick={openWhatsApp}
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">WhatsApp</h3>
              <p className="text-white/50 text-sm">(12) 98897-3547</p>
              <p className="text-green-500 text-sm font-medium mt-1">Clique para conversar →</p>
            </motion.div>

            {/* Email */}
            <motion.div
              className="bg-zinc-900 p-6 rounded-2xl border border-white/5 hover:border-[#E53935]/30 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-12 h-12 bg-[#E53935]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#E53935]/20 transition-colors">
                <Mail className="h-5 w-5 text-[#E53935]" />
              </div>
              <h3 className="font-semibold text-white mb-2">E-mail</h3>
              <p className="text-white/50 text-sm break-all">contato@matheusveiculos.com.br</p>
            </motion.div>

            {/* Hours */}
            <motion.div
              className="bg-zinc-900 p-6 rounded-2xl border border-white/5 hover:border-[#E53935]/30 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-12 h-12 bg-[#E53935]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#E53935]/20 transition-colors">
                <Clock className="h-5 w-5 text-[#E53935]" />
              </div>
              <h3 className="font-semibold text-white mb-2">Horário</h3>
              <p className="text-white/50 text-sm">Seg a Sex: 08h às 18h</p>
              <p className="text-white/50 text-sm">Sábado: 08h às 13h</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Main Content - Location & Form */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Location */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-6">
                Nossa <span className="text-[#E53935]">Localização</span>
              </h2>
              
              <div className="bg-zinc-900 p-6 rounded-2xl border border-white/5 mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#E53935]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-[#E53935]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Endereço</h3>
                    <p className="text-white/50">
                      Av. Major Joaquim Monteiro Patto, 25<br />
                      Chácara do Visconde - Taubaté/SP
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={openGoogleMaps}
                  className="w-full bg-[#E53935] hover:bg-[#C62828] text-white rounded-xl"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Google Maps
                </Button>
              </div>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden border border-white/5 h-[300px]">
                <LocationMap />
              </div>

              {/* Social Media */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Redes Sociais</h3>
                <div className="flex gap-3">
                  <a 
                    href="https://instagram.com/matheusveiculos" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center hover:bg-[#E53935] hover:border-[#E53935] transition-all duration-300 group"
                  >
                    <Instagram className="h-5 w-5 text-white/50 group-hover:text-white" />
                  </a>
                  <a 
                    href="https://facebook.com/matheusveiculos" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center hover:bg-[#E53935] hover:border-[#E53935] transition-all duration-300 group"
                  >
                    <Facebook className="h-5 w-5 text-white/50 group-hover:text-white" />
                  </a>
                  <button 
                    onClick={openWhatsApp}
                    className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center hover:bg-green-500 hover:border-green-500 transition-all duration-300 group"
                  >
                    <MessageCircle className="h-5 w-5 text-white/50 group-hover:text-white" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold mb-6">
                Envie uma <span className="text-[#E53935]">Mensagem</span>
              </h2>

              <div className="bg-zinc-900 p-8 rounded-2xl border border-white/5">
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Nome completo *</label>
                    <Input 
                      placeholder="Seu nome" 
                      className="bg-zinc-800 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 rounded-xl h-12"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">E-mail</label>
                      <Input 
                        placeholder="seu@email.com" 
                        type="email" 
                        className="bg-zinc-800 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 rounded-xl h-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Telefone *</label>
                      <Input 
                        placeholder="(12) 99999-9999" 
                        className="bg-zinc-800 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Assunto</label>
                    <Input 
                      placeholder="Sobre qual veículo deseja saber?" 
                      className="bg-zinc-800 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 rounded-xl h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Mensagem</label>
                    <Textarea 
                      placeholder="Escreva sua mensagem aqui..." 
                      rows={5} 
                      className="bg-zinc-800 border-white/5 text-white placeholder:text-white/30 focus:border-[#E53935]/50 resize-none rounded-xl"
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-[#E53935] hover:bg-[#C62828] text-white py-6 text-lg font-semibold rounded-xl"
                  >
                    Enviar Mensagem
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-center text-white/40 text-sm mb-4">
                    Prefere um atendimento mais rápido?
                  </p>
                  <Button 
                    onClick={openWhatsApp}
                    variant="outline"
                    className="w-full border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white py-5 rounded-xl"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chamar no WhatsApp
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
