import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';
import logoImg from '@/assets/logo-matheus-veiculos.png';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111] text-white">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <img 
              src={logoImg} 
              alt="Matheus Veículos" 
              className="h-14 w-auto mb-6"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Sua loja de veículos seminovos em excelente estado. Qualidade e confiança há mais de 10 anos no mercado.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Navegação</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-400 hover:text-public-primary transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/veiculos" className="text-gray-400 hover:text-public-primary transition-colors">
                  Estoque
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="text-gray-400 hover:text-public-primary transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-gray-400 hover:text-public-primary transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-public-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm">(12) 98897-3547 (Atendimento)</p>
                  <p className="text-gray-400 text-sm">(12) 99668-1249 (Escritório)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-public-primary flex-shrink-0 mt-0.5" />
                <p className="text-gray-400 text-sm">contato@matheusveiculos.com.br</p>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-public-primary flex-shrink-0 mt-0.5" />
                <p className="text-gray-400 text-sm">
                  Av. Major Joaquim Monteiro Patto, 25<br />
                  Chácara do Visconde - Taubaté/SP, 12050-620
                </p>
              </li>
            </ul>
          </div>

          {/* Social & Employee access */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Redes Sociais</h4>
            <div className="flex gap-4 mb-8">
              <a 
                href="#" 
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-public-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-public-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-public-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>

            <Link 
              to="/auth" 
              className="text-gray-500 text-sm hover:text-gray-400 transition-colors"
            >
              Acesso Funcionário →
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} Matheus Veículos. Todos os direitos reservados.
          </p>
          <p className="text-gray-600 text-xs">
            Desenvolvido com ❤️
          </p>
        </div>
      </div>
    </footer>
  );
}
