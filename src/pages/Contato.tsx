import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationMap } from '@/components/ui/expand-map';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openWhatsApp = () => {
    window.open('https://wa.me/5512988973547?text=Olá! Gostaria de mais informações sobre os veículos.', '_blank');
  };

  const openGoogleMaps = () => {
    window.open(
      'https://www.google.com/maps/search/?api=1&query=Av.+Major+Joaquim+Monteiro+Patto+25+Taubaté+SP',
      '_blank'
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Preencha seu nome e telefone');
      return;
    }

    setIsSubmitting(true);
    try {
      const notes = [
        'Lead capturado pelo formulário de contato do site.',
        formSubject && `Assunto: ${formSubject}`,
        formMessage && `Mensagem: ${formMessage}`,
      ].filter(Boolean).join('\n');

      const { error } = await supabase.from('leads').insert({
        name: formName.trim().slice(0, 100),
        phone: formPhone.replace(/\D/g, '').slice(0, 20),
        email: formEmail.trim().slice(0, 255) || null,
        source: 'site',
        status: 'novo',
        notes,
      });

      if (error) throw error;

      toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormSubject('');
      setFormMessage('');
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-24">
      {/* Hero Section */}
      <section className="bg-card py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-['Oswald'] mb-4">
              Entre em <span className="text-primary">Contato</span>
            </h1>
            <p className="text-muted-foreground text-lg">
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
            <motion.div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 group" variants={fadeInUp}>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-['Oswald'] text-lg">Telefone</h3>
              <p className="text-muted-foreground text-sm">(12) 98897-3547</p>
            </motion.div>

            <motion.div className="bg-card p-6 rounded-xl border border-border hover:border-green-500/50 transition-all duration-300 group cursor-pointer" variants={fadeInUp} onClick={openWhatsApp}>
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <WhatsAppIcon className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-['Oswald'] text-lg">WhatsApp</h3>
              <p className="text-muted-foreground text-sm">(12) 98897-3547</p>
              <p className="text-green-500 text-sm font-medium mt-1">Clique para conversar →</p>
            </motion.div>

            <motion.div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 group" variants={fadeInUp}>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-['Oswald'] text-lg">E-mail</h3>
              <p className="text-muted-foreground text-sm break-all">contato@matheusveiculos.com.br</p>
            </motion.div>

            <motion.div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 group" variants={fadeInUp}>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-['Oswald'] text-lg">Horário</h3>
              <p className="text-muted-foreground text-sm">Seg a Sex: 08h às 18h</p>
              <p className="text-muted-foreground text-sm">Sábado: 08h às 13h</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Location & Map */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-3xl font-bold text-foreground mb-6 font-['Oswald']">
                Nossa <span className="text-primary">Localização</span>
              </h2>

              <div className="bg-card p-6 rounded-xl border border-border mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Endereço</h3>
                    <p className="text-muted-foreground">
                      Av. Major Joaquim Monteiro Patto, 25<br />
                      Chácara do Visconde - Taubaté/SP
                    </p>
                  </div>
                </div>

                <Button onClick={openGoogleMaps} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Google Maps
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden border border-border h-[300px]">
                <LocationMap />
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-bold text-foreground mb-4 font-['Oswald']">Redes Sociais</h3>
                <div className="flex gap-4">
                  <a href="https://instagram.com/matheusveiculos" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group">
                    <Instagram className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                  </a>
                  <a href="https://facebook.com/matheusveiculos" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group">
                    <Facebook className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground" />
                  </a>
                  <button onClick={openWhatsApp} className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-green-500 hover:border-green-500 transition-all duration-300 group">
                    <WhatsAppIcon className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <h2 className="text-3xl font-bold text-foreground mb-6 font-['Oswald']">
                Envie uma <span className="text-primary">Mensagem</span>
              </h2>

              <div className="bg-card p-8 rounded-xl border border-border">
                <form className="space-y-5" onSubmit={handleFormSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nome completo *</label>
                    <Input placeholder="Seu nome" value={formName} onChange={(e) => setFormName(e.target.value)} required maxLength={100} className="bg-background border-border focus:border-primary" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">E-mail</label>
                      <Input placeholder="seu@email.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} maxLength={255} className="bg-background border-border focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Telefone *</label>
                      <Input placeholder="(12) 99999-9999" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} required maxLength={20} className="bg-background border-border focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Assunto</label>
                    <Input placeholder="Sobre qual veículo deseja saber?" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} maxLength={200} className="bg-background border-border focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Mensagem</label>
                    <Textarea placeholder="Escreva sua mensagem aqui..." rows={5} value={formMessage} onChange={(e) => setFormMessage(e.target.value)} maxLength={1000} className="bg-background border-border focus:border-primary resize-none" />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-6 text-lg font-semibold disabled:opacity-60">
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-center text-muted-foreground text-sm mb-4">
                    Prefere um atendimento mais rápido?
                  </p>
                  <Button onClick={openWhatsApp} variant="outline" className="w-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white py-5">
                    <WhatsAppIcon className="h-5 w-5 mr-2" />
                    Chamar no WhatsApp
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 font-['Oswald']">
              Venha nos Visitar!
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Nossa equipe está pronta para encontrar o veículo ideal para você.
              Venha conhecer nosso estoque e fazer o melhor negócio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={openGoogleMaps} size="lg" className="bg-white text-primary hover:bg-gray-100 font-semibold px-8">
                <MapPin className="h-5 w-5 mr-2" />
                Como Chegar
              </Button>
              <Button onClick={openWhatsApp} size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold px-8">
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
