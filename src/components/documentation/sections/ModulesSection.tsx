import { SectionHeader } from "../ui/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, Users, Car, DollarSign, TrendingUp, Megaphone, Award, MessageSquare, Settings } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ModulesSectionProps {
  searchTerm: string;
}

const modules = [
  {
    id: "crm",
    name: "CRM / Leads",
    icon: Users,
    description: "Gestão completa de leads e negociações",
    routes: ["/crm", "/crm/leads", "/crm/follow-ups", "/crm/perdas", "/crm/analytics"],
    features: [
      "Pipeline de leads com status: novo, contactado, qualificado, negociando, convertido, perdido, reativado",
      "Pipeline de negociações com stages: atendimento_ia, negociando, follow_up, ganho, perdido",
      "Registro de interações (ligação, whatsapp, email, visita, proposta)",
      "Sistema de follow-ups automatizados com fluxos configuráveis",
      "Recuperação de perdas com regras automáticas",
      "Qualificação de leads (hot, warm, cold)",
      "Atribuição automática via Round Robin",
      "Analytics com métricas de conversão",
    ],
    tables: ["leads", "lead_interactions", "lead_assignments", "lead_costs", "negotiations", "customers", "follow_up_flows", "follow_up_executions", "loss_recovery_rules", "loss_recovery_executions"],
  },
  {
    id: "estoque",
    name: "Estoque de Veículos",
    icon: Car,
    description: "Controle completo do inventário de veículos",
    routes: ["/estoque", "/estoque/:id", "/estoque/importar"],
    features: [
      "Cadastro completo de veículos com dados técnicos",
      "Gestão de fotos com upload para Supabase Storage",
      "Controle de custos por veículo (aquisição, manutenção, outros)",
      "Simulador de venda com cálculo de lucro",
      "DRE individual por veículo",
      "Status: disponível, reservado, vendido",
      "Integração com Mercado Livre (configurável)",
      "Importação em lote de veículos",
      "Dias em estoque e alertas de interesse",
    ],
    tables: ["vehicles", "vehicle_images", "vehicle_costs", "vehicle_simulations", "vehicle_interest_alerts"],
  },
  {
    id: "vendas",
    name: "Vendas",
    icon: DollarSign,
    description: "Dashboard e gestão de vendas",
    routes: ["/vendas", "/vendas/aprovacoes", "/vendas/vendas", "/vendas/equipe", "/vendas/equipe/:id", "/vendas/lucro", "/vendas/metricas"],
    features: [
      "Dashboard com KPIs de vendas",
      "Sistema de aprovações para vendas pendentes",
      "Lista completa de vendas com filtros",
      "Visão por equipe de vendedores",
      "Detalhes de vendedor com histórico",
      "Relatório de lucro por período",
      "Métricas avançadas de conversão",
      "Múltiplas formas de pagamento por venda",
      "Cálculo automático de comissões",
    ],
    tables: ["sales", "sale_payment_methods", "sale_commissions"],
  },
  {
    id: "financeiro",
    name: "Financeiro",
    icon: TrendingUp,
    description: "Controle financeiro completo",
    routes: ["/financeiro", "/financeiro/lancamentos", "/financeiro/dre", "/financeiro/fluxo-caixa", "/financeiro/rentabilidade", "/financeiro/comissoes", "/financeiro/alertas"],
    features: [
      "Dashboard financeiro com resumo",
      "Lançamentos de receitas e despesas",
      "DRE (Demonstração de Resultado)",
      "Fluxo de caixa com projeções",
      "Análise de rentabilidade",
      "Gestão de comissões a pagar",
      "Alertas de vencimentos e inadimplência",
      "Categorias e subcategorias customizáveis",
      "Recorrência de lançamentos",
    ],
    tables: ["financial_transactions", "financial_categories"],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    description: "Gestão de campanhas e análise de canais",
    routes: ["/marketing", "/relatorios"],
    features: [
      "Integração com Meta Ads (Facebook/Instagram)",
      "Integração com Google Ads",
      "Dashboard comparativo de canais",
      "Análise de origem de leads (UTM)",
      "Calendário de campanhas",
      "Construtor de UTMs",
      "Alertas de performance",
      "Relatórios automatizados",
      "Custos por canal e ROI",
    ],
    tables: ["marketing_campaigns", "marketing_alerts", "utm_links", "channel_costs", "campaign_events", "meta_campaigns", "meta_adsets", "meta_ads", "meta_insights", "meta_sync_logs", "google_campaigns", "google_ad_groups", "google_ads", "google_insights", "google_sync_logs"],
  },
  {
    id: "comissoes",
    name: "Comissões",
    icon: Award,
    description: "Sistema completo de comissões para vendedores",
    routes: ["/comissoes", "/comissoes/regras", "/comissoes/metas", "/comissoes/ranking", "/comissoes/historico", "/comissoes/simulador"],
    features: [
      "Dashboard de comissões do vendedor",
      "Regras flexíveis (fixo, % venda, % lucro, escalonado)",
      "Condições por valor, margem, dias em estoque",
      "Bônus por origem do lead",
      "Metas individuais por período",
      "Ranking de vendedores",
      "Histórico completo de comissões",
      "Simulador de comissão",
      "Aprovação e pagamento de comissões",
      "Auditoria de alterações",
    ],
    tables: ["commission_rules", "sale_commissions", "commission_splits", "commission_audit_log", "salesperson_goals"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    description: "Integração completa com WhatsApp via Evolution API",
    routes: ["/whatsapp", "/whatsapp/painel", "/whatsapp/contatos", "/whatsapp/templates", "/whatsapp/instancias", "/whatsapp/config"],
    features: [
      "Múltiplas instâncias do WhatsApp",
      "Painel de gerenciamento para gerentes",
      "Conversas em tempo real",
      "Lista de contatos",
      "Templates de mensagens",
      "Webhook para recebimento de mensagens",
      "Criação automática de leads",
      "Atribuição via Round Robin",
      "QR Code para conexão",
    ],
    tables: ["whatsapp_instances", "whatsapp_contacts", "whatsapp_messages", "whatsapp_templates"],
  },
  {
    id: "configuracoes",
    name: "Configurações",
    icon: Settings,
    description: "Configurações do sistema e usuários",
    routes: ["/configuracoes"],
    features: [
      "Gestão de usuários",
      "Atribuição de roles (Gerente, Vendedor, Marketing)",
      "Permissões granulares por módulo",
      "Configuração de Round Robin",
      "Logs de atividade",
      "Usuário master com acesso total",
    ],
    tables: ["profiles", "user_roles", "user_permissions", "activity_logs", "round_robin_config"],
  },
];

export const ModulesSection = ({ searchTerm }: ModulesSectionProps) => {
  const filteredModules = modules.filter(
    (mod) =>
      searchTerm === "" ||
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.features.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Módulos do Sistema"
        description="Documentação detalhada de cada módulo da aplicação"
        icon={Boxes}
      />

      <Accordion type="single" collapsible className="space-y-4">
        {filteredModules.map((module) => {
          const Icon = module.icon;
          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{module.name}</div>
                    <div className="text-xs text-muted-foreground">{module.description}</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Rotas</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.routes.map((route) => (
                        <Badge key={route} variant="outline" className="font-mono text-xs">
                          {route}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Funcionalidades</h4>
                    <ul className="space-y-1">
                      {module.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Tabelas Relacionadas</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.tables.map((table) => (
                        <Badge key={table} variant="secondary" className="font-mono text-xs">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
