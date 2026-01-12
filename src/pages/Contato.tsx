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
    <div className="bg-public-bg min-h-screen pt-24">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#111] py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white font-['Oswald'] mb-4">
              Entre em <span className="text-public-primary">Contato</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Estamos prontos para atendê-lo. Visite nossa loja ou entre em contato pelos nossos canais.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 -mt-8">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid md:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Phone */}
            <motion.div
              className="bg-public-surface p-6 rounded-xl border border-public-border hover:border-public-primary/50 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-14 h-14 bg-public-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-public-primary/20 transition-colors">
                <Phone className="h-6 w-6 text-public-primary" />
              </div>
              <h3 className="font-semibold text-public-fg mb-2 font-['Oswald'] text-lg">Telefone</h3>
              <p className="text-public-fg/60 text-sm">(12) 98897-3547 (Atendimento)</p>
              <p className="text-public-fg/60 text-sm">(12) 99668-1249 (Escritório)</p>
            </motion.div>

            {/* WhatsApp */}
            <motion.div
              className="bg-public-surface p-6 rounded-xl border border-public-border hover:border-green-500/50 transition-all duration-300 group cursor-pointer"
              variants={fadeInUp}
              onClick={openWhatsApp}
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-public-fg mb-2 font-['Oswald'] text-lg">WhatsApp</h3>
              <p className="text-public-fg/60 text-sm">(12) 98897-3547</p>
              <p className="text-green-500 text-sm font-medium mt-1">Clique para conversar →</p>
            </motion.div>

            {/* Email */}
            <motion.div
              className="bg-public-surface p-6 rounded-xl border border-public-border hover:border-public-primary/50 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-14 h-14 bg-public-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-public-primary/20 transition-colors">
                <Mail className="h-6 w-6 text-public-primary" />
              </div>
              <h3 className="font-semibold text-public-fg mb-2 font-['Oswald'] text-lg">E-mail</h3>
              <p className="text-public-fg/60 text-sm break-all">contato@matheusveiculos.com.br</p>
            </motion.div>

            {/* Hours */}
            <motion.div
              className="bg-public-surface p-6 rounded-xl border border-public-border hover:border-public-primary/50 transition-all duration-300 group"
              variants={fadeInUp}
            >
              <div className="w-14 h-14 bg-public-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-public-primary/20 transition-colors">
                <Clock className="h-6 w-6 text-public-primary" />
              </div>
              <h3 className="font-semibold text-public-fg mb-2 font-['Oswald'] text-lg">Horário</h3>
              <p className="text-public-fg/60 text-sm">Seg a Sex: 08h às 18h</p>
              <p className="text-public-fg/60 text-sm">Sábado: 08h às 13h</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Location & Map */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-public-fg mb-6 font-['Oswald']">
                Nossa <span className="text-public-primary">Localização</span>
              </h2>
              
              <div className="bg-public-surface p-6 rounded-xl border border-public-border mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-public-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-public-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-public-fg mb-1">Endereço</h3>
                    <p className="text-public-fg/60">
                      Av. Major Joaquim Monteiro Patto, 25<br />
                      Chácara do Visconde - Taubaté/SP, CEP 12050-620
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={openGoogleMaps}
                  className="w-full bg-public-primary hover:bg-public-primary-dark text-white"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Google Maps
                </Button>
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-public-border h-[300px]">
                <LocationMap />
              </div>

              {/* Social Media */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-public-fg mb-4 font-['Oswald']">Redes Sociais</h3>
                <div className="flex gap-4">
                  <a 
                    href="https://instagram.com/matheusveiculos" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-public-surface border border-public-border rounded-xl flex items-center justify-center hover:bg-public-primary hover:border-public-primary transition-all duration-300 group"
                  >
                    <Instagram className="h-5 w-5 text-public-fg/60 group-hover:text-white" />
                  </a>
                  <a 
                    href="https://facebook.com/matheusveiculos" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-public-surface border border-public-border rounded-xl flex items-center justify-center hover:bg-public-primary hover:border-public-primary transition-all duration-300 group"
                  >
                    <Facebook className="h-5 w-5 text-public-fg/60 group-hover:text-white" />
                  </a>
                  <button 
                    onClick={openWhatsApp}
                    className="w-12 h-12 bg-public-surface border border-public-border rounded-xl flex items-center justify-center hover:bg-green-500 hover:border-green-500 transition-all duration-300 group"
                  >
                    <MessageCircle className="h-5 w-5 text-public-fg/60 group-hover:text-white" />
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
              <h2 className="text-3xl font-bold text-public-fg mb-6 font-['Oswald']">
                Envie uma <span className="text-public-primary">Mensagem</span>
              </h2>

              <div className="bg-public-surface p-8 rounded-xl border border-public-border">
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-public-fg mb-2">Nome completo</label>
                    <Input 
                      placeholder="Seu nome" 
                      className="bg-public-bg border-public-border focus:border-public-primary"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-public-fg mb-2">E-mail</label>
                      <Input 
                        placeholder="seu@email.com" 
                        type="email" 
                        className="bg-public-bg border-public-border focus:border-public-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-public-fg mb-2">Telefone</label>
                      <Input 
                        placeholder="(11) 99999-9999" 
                        className="bg-public-bg border-public-border focus:border-public-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-public-fg mb-2">Assunto</label>
                    <Input 
                      placeholder="Sobre qual veículo deseja saber?" 
                      className="bg-public-bg border-public-border focus:border-public-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-public-fg mb-2">Mensagem</label>
                    <Textarea 
                      placeholder="Escreva sua mensagem aqui..." 
                      rows={5} 
                      className="bg-public-bg border-public-border focus:border-public-primary resize-none"
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-public-primary hover:bg-public-primary-dark text-white py-6 text-lg font-semibold"
                  >
                    Enviar Mensagem
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-public-border">
                  <p className="text-center text-public-fg/60 text-sm mb-4">
                    Prefere um atendimento mais rápido?
                  </p>
                  <Button 
                    onClick={openWhatsApp}
                    variant="outline"
                    className="w-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white py-5"
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

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-public-primary to-public-primary-dark">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-['Oswald']">
              Venha nos Visitar!
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Nossa equipe está pronta para encontrar o veículo ideal para você. 
              Venha conhecer nosso estoque e fazer o melhor negócio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={openGoogleMaps}
                size="lg"
                className="bg-white text-public-primary hover:bg-gray-100 font-semibold px-8"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Como Chegar
              </Button>
              <Button 
                onClick={openWhatsApp}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 font-semibold px-8"
              >
                <Phone className="h-5 w-5 mr-2" />
                Ligar Agora
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
