import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Gauge, Fuel, Settings2, Heart,
  Share2, ChevronLeft, ChevronRight, Shield,
  Calculator, Eye, Phone, MapPin, Star,
  CheckCircle2, X, Palette, Car, Loader2, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { usePublicVehicle } from '@/hooks/usePublicVehicles';
import { fuelTypeLabels, transmissionLabels } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoImg from '@/assets/logo-matheus-veiculos.png';

// ─── WhatsApp SVG Icon ───
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ─── CRM Lead Capture ───
async function createLeadInCRM(data: {
  name: string;
  phone: string;
  email?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVersion: string | null;
  vehicleYear: string;
  vehiclePrice: number | null;
  vehicleId: string;
}) {
  const vehicleInfo = `${data.vehicleBrand} ${data.vehicleModel} ${data.vehicleVersion || ''} ${data.vehicleYear}`.trim();
  const notes = `Lead capturado pelo site público.\nVeículo de interesse: ${vehicleInfo}\nPreço: ${data.vehiclePrice ? `R$ ${data.vehiclePrice.toLocaleString('pt-BR')}` : 'Consultar'}`;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      name: data.name.trim().slice(0, 100),
      phone: data.phone.trim().slice(0, 20),
      email: data.email?.trim().slice(0, 255) || null,
      source: 'website',
      status: 'novo',
      vehicle_interest: vehicleInfo,
      notes,
      qualification_status: 'nao_qualificado',
    })
    .select()
    .single();

  if (leadError) throw leadError;

  const { data: rrData } = await supabase.rpc('get_next_round_robin_salesperson');
  const salespersonId = lead.assigned_to || rrData;

  if (salespersonId) {
    if (!lead.assigned_to) {
      await supabase.from('leads').update({ assigned_to: salespersonId }).eq('id', lead.id);
      await supabase.rpc('increment_round_robin_counters', { p_salesperson_id: salespersonId });
    }

    await supabase
      .from('negotiations')
      .insert({
        lead_id: lead.id,
        salesperson_id: salespersonId,
        vehicle_id: data.vehicleId,
        status: 'em_andamento',
        probability: 20,
        estimated_value: data.vehiclePrice,
        notes: `Interesse via site público — ${vehicleInfo}`,
      });
  }

  return lead;
}

// ─── Financing Simulator ───
function FinancingSimulator({ price }: { price: number }) {
  const [downPaymentPercent, setDownPaymentPercent] = useState([30]);
  const [months, setMonths] = useState([48]);
  const rate = 1.49 / 100;
  const downPayment = price * (downPaymentPercent[0] / 100);
  const financed = price - downPayment;
  const monthlyPayment = financed > 0
    ? (financed * rate * Math.pow(1 + rate, months[0])) / (Math.pow(1 + rate, months[0]) - 1)
    : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-foreground/20 to-accent" />
      <div className="p-6">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-5">
          <Calculator className="h-5 w-5 text-primary" /> Simule o Financiamento
        </h3>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Entrada</span>
              <span className="font-bold text-primary">
                {downPaymentPercent[0]}% — R$ {downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <Slider value={downPaymentPercent} onValueChange={setDownPaymentPercent} min={10} max={80} step={5} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Parcelas</span>
              <span className="font-bold text-foreground">{months[0]}x</span>
            </div>
            <Slider value={months} onValueChange={setMonths} min={12} max={60} step={6} />
          </div>
          <div className="bg-muted rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Parcela estimada</p>
            <p className="text-3xl font-bold text-primary mt-1">
              R$ {monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-2">*Simulação ilustrativa — taxa de 1,49% a.m.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery ───
function VehicleGallery({ images, brand, model }: { images: { id: string; image_url: string; is_cover: boolean | null }[]; brand: string; model: string }) {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl bg-muted flex items-center justify-center border border-border">
        <Car className="h-20 w-20 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <>
      <div className="relative group overflow-hidden lg:rounded-xl">
        <div className="aspect-[4/3] md:aspect-[16/10] bg-black cursor-pointer" onClick={() => setFullscreen(true)}>
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current].image_url}
              alt={`${brand} ${model}`}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-white/10">
            <Eye className="h-3 w-3" /> {current + 1}/{images.length}
          </div>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-foreground/20 to-accent" />
        </div>
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 md:p-2.5 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10">
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 md:p-2.5 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10">
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 px-3 lg:px-0 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-[52px] h-[38px] md:w-[72px] md:h-[52px] rounded-lg overflow-hidden border-2 transition-all ${i === current ? 'border-primary ring-1 ring-primary/30 scale-[1.05]' : 'border-border opacity-50 hover:opacity-80'}`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setFullscreen(false)} className="absolute top-5 right-5 text-white/60 hover:text-white z-10 bg-white/10 rounded-full p-2 backdrop-blur">
              <X className="h-6 w-6" />
            </button>
            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 rounded-full p-3">
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 rounded-full p-3">
              <ChevronRight className="h-8 w-8" />
            </button>
            <img src={images[current].image_url} alt="" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />
            <div className="absolute bottom-6 text-white/40 text-sm font-medium">{current + 1} / {images.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ───
export default function PublicVehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: vehicle, isLoading, error } = usePublicVehicle(id || '');

  const [liked, setLiked] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestName, setInterestName] = useState('');
  const [interestPhone, setInterestPhone] = useState('');
  const [interestEmail, setInterestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatPrice = (price: number | null) => {
    if (!price) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(price);
  };
  const formatKm = (km: number | null) => km ? new Intl.NumberFormat('pt-BR').format(km) + ' km' : '—';

  const generateVehicleDescription = (v: any): string => {
    const parts: string[] = [];
    parts.push(`${v.brand} ${v.model}${v.version ? ' ' + v.version : ''}, ano ${v.year_fabrication}/${v.year_model}.`);
    if (v.km !== null && v.km !== undefined) parts.push(`Com ${formatKm(v.km)} rodados.`);
    if (v.transmission) parts.push(`Câmbio ${(transmissionLabels[v.transmission] || v.transmission).toLowerCase()}.`);
    if (v.fuel_type) parts.push(`Combustível: ${(fuelTypeLabels[v.fuel_type] || v.fuel_type).toLowerCase()}.`);
    if (v.color) parts.push(`Na cor ${v.color.toLowerCase()}.`);
    if (v.doors) parts.push(`${v.doors} portas.`);
    parts.push('Veículo revisado e pronto para uso. Venha conferir pessoalmente na Matheus Veículos.');
    return parts.join(' ');
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Confira esse ${vehicle?.brand} ${vehicle?.model} - ${formatPrice(vehicle?.sale_price || null)}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleInterestSubmit = async () => {
    if (!interestName.trim() || !interestPhone.trim()) {
      toast.error('Preencha seu nome e telefone');
      return;
    }
    if (interestPhone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone inválido');
      return;
    }
    if (!vehicle) return;

    setIsSubmitting(true);
    try {
      await createLeadInCRM({
        name: interestName,
        phone: interestPhone.replace(/\D/g, ''),
        email: interestEmail || undefined,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        vehicleVersion: vehicle.version,
        vehicleYear: `${vehicle.year_fabrication}/${vehicle.year_model}`,
        vehiclePrice: vehicle.sale_price,
        vehicleId: vehicle.id,
      });
      setSubmitted(true);
      toast.success('Interesse registrado! Entraremos em contato em breve.');
      setInterestName('');
      setInterestPhone('');
      setInterestEmail('');
    } catch (err) {
      console.error('Lead creation error:', err);
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappLink = vehicle
    ? `https://wa.me/5512988973547?text=${encodeURIComponent(`Olá! Tenho interesse no ${vehicle.brand} ${vehicle.model} ${vehicle.version || ''} - ${formatPrice(vehicle.sale_price)}`)}`
    : '#';

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-[400px] bg-muted rounded-2xl" />
            <div className="h-8 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-background min-h-screen pt-24">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Veículo não encontrado</h1>
          <Link to="/veiculos">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">Voltar ao estoque</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Build vehicle highlights
  const highlights: { text: string; bold: string }[] = [];
  if (vehicle.km !== null && vehicle.km !== undefined) highlights.push({ bold: `APENAS ${formatKm(vehicle.km)}`, text: 'rodados.' });
  if (vehicle.transmission) highlights.push({ bold: `CÂMBIO ${(transmissionLabels[vehicle.transmission] || vehicle.transmission).toUpperCase()}`, text: 'para seu conforto.' });
  if (vehicle.fuel_type) highlights.push({ bold: (fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type).toUpperCase(), text: '— economia e performance.' });
  if (vehicle.color) highlights.push({ bold: `COR ${vehicle.color.toUpperCase()}`, text: '— elegância que se destaca.' });
  if (vehicle.doors) highlights.push({ bold: `${vehicle.doors} PORTAS`, text: '— praticidade para toda a família.' });

  return (
    <div className="bg-background min-h-screen pt-14 md:pt-20 text-foreground overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="px-3 md:container md:mx-auto md:px-4 pt-2 pb-1.5 md:pt-4 md:pb-3">
        <Link to="/veiculos" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-xs transition-colors bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-full border border-border">
          <ArrowLeft className="h-3 w-3" /> VOLTAR
        </Link>
      </div>

      {/* Gallery full-width on mobile */}
      <div className="lg:hidden">
        <VehicleGallery images={vehicle.images} brand={vehicle.brand} model={vehicle.model} />
      </div>

      <div className="px-3 md:container md:mx-auto md:px-4 pb-20 lg:pb-12">
        <div className="grid lg:grid-cols-5 gap-4 md:gap-8">

          {/* ───── LEFT — Gallery (desktop only inside grid) ───── */}
          <motion.div className="lg:col-span-3 space-y-3 md:space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="hidden lg:block">
              <VehicleGallery images={vehicle.images} brand={vehicle.brand} model={vehicle.model} />
            </div>

            {/* ─── Vehicle Title + Price (visible on mobile below gallery) ─── */}
            <div className="lg:hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-primary font-bold uppercase tracking-[0.15em] text-[10px]">{vehicle.brand}</p>
                  <h1 className="text-xl font-bold text-foreground leading-tight mt-0.5 truncate">{vehicle.model}</h1>
                  {vehicle.version && <p className="text-muted-foreground text-xs mt-0.5 truncate">{vehicle.version}</p>}
                  <p className="text-muted-foreground/50 text-[10px] mt-0.5">{vehicle.year_fabrication}/{vehicle.year_model}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setLiked(!liked); toast.success(liked ? 'Removido' : 'Favoritado ❤️'); }} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-accent text-accent' : 'text-muted-foreground/40'}`} />
                  </button>
                  <button onClick={handleShare} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </button>
                </div>
              </div>
              <div className="mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xl font-bold text-primary tracking-tight">{formatPrice(vehicle.sale_price)}</p>
              </div>
            </div>

            {/* ─── TRUST SECTION (Mobile) ─── */}
            <div className="lg:hidden space-y-3">
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-2.5">
                {[
                  { text: 'VEÍCULO COM ', bold: 'PROCEDÊNCIA' },
                  { text: 'SELECIONADO PELA ', bold: 'CURADORIA MATHEUS VEÍCULOS' },
                  { text: 'HISTÓRICO CONHECIDO E ', bold: 'QUALIDADE COMPROVADA' },
                ].map(({ bold, text }) => (
                  <div key={bold} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-foreground text-xs leading-snug">
                      {text}<span className="font-bold">{bold}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full h-12 text-sm font-bold rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xl shadow-[#25D366]/20 transition-all gap-2" size="lg">
                    <WhatsAppIcon className="h-5 w-5" />
                    Falar com Consultor
                  </Button>
                </a>
                <p className="text-center text-[10px] text-muted-foreground/60 leading-tight">
                  Confirme procedência, padrão e disponibilidade
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-bold text-foreground mb-3">
                  O que faz deste carro ser <span className="text-accent">diferente</span>
                </h2>
                <div className="space-y-2.5">
                  {highlights.map(({ bold, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground text-[13px] leading-snug">
                        <span className="font-bold text-foreground">{bold}</span>{text ? ` ${text}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground mb-2">Sobre este veículo</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed whitespace-pre-line">
                  {generateVehicleDescription(vehicle)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { icon: Calendar, label: 'Ano', value: `${vehicle.year_fabrication}/${vehicle.year_model}` },
                  { icon: Gauge, label: 'KM', value: formatKm(vehicle.km) },
                  { icon: Fuel, label: 'Combustível', value: fuelTypeLabels[vehicle.fuel_type || ''] || vehicle.fuel_type || '—' },
                  { icon: Settings2, label: 'Câmbio', value: transmissionLabels[vehicle.transmission || ''] || vehicle.transmission || '—' },
                  { icon: Palette, label: 'Cor', value: vehicle.color || '—' },
                  { icon: Car, label: 'Portas', value: vehicle.doors ? `${vehicle.doors}p` : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-1.5 p-2 rounded-lg border border-border bg-card">
                    <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                      <Icon className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-medium">{label}</p>
                      <p className="font-semibold text-foreground text-[11px] truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-11 text-xs font-bold rounded-lg border-2 border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-all"
                onClick={() => setShowInterestForm(true)}
              >
                <Send className="mr-1.5 h-4 w-4" /> {submitted ? 'Enviado ✓' : 'Tenho Interesse'}
              </Button>

              <AnimatePresence>
                {showInterestForm && !submitted && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                      <p className="text-sm font-bold text-foreground text-center">Deixe seus dados e entraremos em contato!</p>
                      <input type="text" placeholder="Seu nome completo" value={interestName} onChange={e => setInterestName(e.target.value)} maxLength={100} className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
                      <input type="tel" placeholder="Telefone (DDD + número)" value={interestPhone} onChange={e => setInterestPhone(e.target.value)} maxLength={20} className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
                      <input type="email" placeholder="E-mail (opcional)" value={interestEmail} onChange={e => setInterestEmail(e.target.value)} maxLength={255} className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
                      <Button onClick={handleInterestSubmit} disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-lg h-12">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isSubmitting ? 'Enviando...' : 'Enviar'}
                      </Button>
                      <p className="text-[10px] text-muted-foreground/30 text-center">Seus dados estão seguros.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {submitted && (
                <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-primary font-bold text-sm">Interesse registrado!</p>
                  <p className="text-muted-foreground/50 text-xs mt-1">Nossa equipe entrará em contato em breve.</p>
                </div>
              )}

              {vehicle.sale_price && vehicle.sale_price > 0 && (
                <FinancingSimulator price={vehicle.sale_price} />
              )}

              <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <div className="p-1 rounded-md bg-primary/10"><MapPin className="h-3 w-3 text-primary" /></div>
                  <span className="text-muted-foreground">Taubaté, SP — visite nossa loja</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px]">
                  <div className="p-1 rounded-md bg-primary/10"><Car className="h-3 w-3 text-primary" /></div>
                  <span className="text-muted-foreground">Test-drive disponível</span>
                </div>
              </div>
            </div>

            {/* ─── Desktop-only content below gallery ─── */}
            <div className="hidden lg:block space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-muted text-muted-foreground border border-border">
                  <Shield className="h-3 w-3 mr-1" /> Documentação verificada
                </Badge>
                <Badge className="bg-muted text-muted-foreground border border-border">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Revisado
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Calendar, label: 'Ano', value: `${vehicle.year_fabrication}/${vehicle.year_model}` },
                  { icon: Gauge, label: 'KM', value: formatKm(vehicle.km) },
                  { icon: Fuel, label: 'Combustível', value: fuelTypeLabels[vehicle.fuel_type || ''] || vehicle.fuel_type || '—' },
                  { icon: Settings2, label: 'Câmbio', value: transmissionLabels[vehicle.transmission || ''] || vehicle.transmission || '—' },
                  { icon: Palette, label: 'Cor', value: vehicle.color || '—' },
                  { icon: Car, label: 'Portas', value: vehicle.doors ? `${vehicle.doors}p` : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">{label}</p>
                      <p className="font-semibold text-foreground text-sm truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">Sobre este veículo</h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {generateVehicleDescription(vehicle)}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-muted-foreground/30 to-accent" />
                <div className="grid grid-cols-3 divide-x divide-border">
                  {[
                    { icon: Shield, title: 'Procedência Verificada', desc: 'Histórico completo checado' },
                    { icon: CheckCircle2, title: 'Vistoria Cautelar', desc: 'Revisado pela nossa equipe' },
                    { icon: Star, title: 'Garantia Matheus', desc: 'Compre com total segurança' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 p-5">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ───── RIGHT — Price + CTA (Desktop only, 2 cols) ───── */}
          <motion.div className="hidden lg:block lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="lg:sticky lg:top-24 space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-muted-foreground/30 to-accent" />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-primary font-bold uppercase tracking-[0.15em] text-xs">{vehicle.brand}</p>
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mt-1">{vehicle.model}</h1>
                      {vehicle.version && <p className="text-muted-foreground text-sm mt-0.5">{vehicle.version}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setLiked(!liked); toast.success(liked ? 'Removido' : 'Favoritado ❤️'); }} className="p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                        <Heart className={`h-4 w-4 ${liked ? 'fill-accent text-accent' : 'text-muted-foreground/40'}`} />
                      </button>
                      <button onClick={handleShare} className="p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                        <Share2 className="h-4 w-4 text-muted-foreground/40" />
                      </button>
                    </div>
                  </div>

                  <div className="my-5 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                    <p className="text-4xl font-bold text-primary tracking-tight">{formatPrice(vehicle.sale_price)}</p>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[
                      { bold: 'PROCEDÊNCIA', text: 'VEÍCULO COM' },
                      { bold: 'CURADORIA MATHEUS VEÍCULOS', text: 'SELECIONADO PELA' },
                      { bold: 'QUALIDADE COMPROVADA.', text: 'HISTÓRICO CONHECIDO E' },
                    ].map(({ bold, text }) => (
                      <div key={bold} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-muted-foreground text-sm leading-snug">
                          {text} <span className="font-bold text-foreground">{bold}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full h-13 text-base font-bold rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground shadow-xl shadow-accent/20 transition-all uppercase tracking-wide" size="lg">
                        FALAR COM NOSSO CONSULTOR
                      </Button>
                    </a>
                    <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-wider leading-tight">
                      Confirmar procedência, padrão e disponibilidade
                    </p>
                    <a href="tel:+5512988973547" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground text-sm">(12) 98897-3547</span>
                    </a>
                    <Button
                      className="w-full text-muted-foreground/50 hover:text-foreground rounded-xl border border-border"
                      variant="ghost"
                      size="lg"
                      onClick={() => setShowInterestForm(!showInterestForm)}
                    >
                      <Send className="mr-2 h-4 w-4" /> {submitted ? 'Interesse Enviado ✓' : 'Tenho Interesse'}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showInterestForm && !submitted && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 p-4 rounded-xl bg-muted border border-border space-y-3">
                          <p className="text-xs text-muted-foreground text-center">Preencha e entraremos em contato!</p>
                          <input type="text" placeholder="Seu nome completo" value={interestName} onChange={e => setInterestName(e.target.value)} maxLength={100} className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          <input type="tel" placeholder="Telefone (DDD + número)" value={interestPhone} onChange={e => setInterestPhone(e.target.value)} maxLength={20} className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          <input type="email" placeholder="E-mail (opcional)" value={interestEmail} onChange={e => setInterestEmail(e.target.value)} maxLength={255} className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          <Button onClick={handleInterestSubmit} disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-lg">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Enviando...' : 'Enviar'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {submitted && (
                    <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                      <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-primary font-bold text-sm">Interesse registrado!</p>
                      <p className="text-muted-foreground/50 text-xs mt-1">Nossa equipe entrará em contato em breve.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-base font-bold text-foreground mb-4">
                  O QUE FAZ DESTE CARRO <span className="text-accent">DIFERENTE</span>
                </h2>
                <div className="space-y-3">
                  {highlights.map(({ bold, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground text-sm leading-snug">
                        <span className="font-bold text-foreground">{bold}</span>{text ? ` ${text}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {vehicle.sale_price && vehicle.sale_price > 0 && (
                <FinancingSimulator price={vehicle.sale_price} />
              )}

              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-md bg-primary/10"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
                  <span className="text-muted-foreground">Taubaté, SP — visite nossa loja</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-md bg-primary/10"><Car className="h-3.5 w-3.5 text-primary" /></div>
                  <span className="text-muted-foreground">Test-drive disponível</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fixed Mobile CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border px-3 py-2 z-40">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-primary">{formatPrice(vehicle.sale_price)}</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-accent hover:bg-accent/80 text-accent-foreground h-9 px-4 font-bold rounded-lg shadow-lg uppercase text-[11px] tracking-wider" size="sm">
              <WhatsAppIcon className="mr-1.5 h-3.5 w-3.5" /> CONSULTOR
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
