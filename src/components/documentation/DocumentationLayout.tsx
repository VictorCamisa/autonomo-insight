import { useState, useRef } from "react";
import { DocumentationNav } from "./DocumentationNav";
import { OverviewSection } from "./sections/OverviewSection";
import { ModulesSection } from "./sections/ModulesSection";
import { DatabaseSection } from "./sections/DatabaseSection";
import { EdgeFunctionsSection } from "./sections/EdgeFunctionsSection";
import { PermissionsSection } from "./sections/PermissionsSection";
import { IntegrationsSection } from "./sections/IntegrationsSection";
import { TutorialsSection } from "./sections/TutorialsSection";
import { RoutesSection } from "./sections/RoutesSection";
import { HooksSection } from "./sections/HooksSection";
import { AIAgentSection } from "./sections/AIAgentSection";
import { AgentConfigSection } from "./sections/AgentConfigSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, FileDown, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import jsPDF from "jspdf";

export type DocSection = 
  | "overview" 
  | "ai-agent"
  | "agent-config"
  | "modules" 
  | "database" 
  | "edge-functions" 
  | "permissions" 
  | "integrations" 
  | "tutorials"
  | "routes"
  | "hooks";

const ALL_SECTIONS: DocSection[] = [
  "overview",
  "ai-agent",
  "agent-config",
  "modules", 
  "database",
  "edge-functions",
  "permissions",
  "integrations",
  "tutorials",
  "routes",
  "hooks"
];

const SECTION_TITLES: Record<DocSection, string> = {
  "overview": "Visão Geral",
  "ai-agent": "Documentação AI Agent",
  "agent-config": "Configuração Anti-Alucinação",
  "modules": "Módulos do Sistema",
  "database": "Banco de Dados",
  "edge-functions": "Edge Functions",
  "permissions": "Sistema de Permissões",
  "integrations": "Integrações Externas",
  "tutorials": "Tutoriais de Uso",
  "routes": "Rotas da Aplicação",
  "hooks": "Hooks Personalizados"
};

export const DocumentationLayout = () => {
  const [activeSection, setActiveSection] = useState<DocSection>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection searchTerm={searchTerm} />;
      case "ai-agent":
        return <AIAgentSection searchTerm={searchTerm} />;
      case "agent-config":
        return <AgentConfigSection />;
      case "modules":
        return <ModulesSection searchTerm={searchTerm} />;
      case "database":
        return <DatabaseSection searchTerm={searchTerm} />;
      case "edge-functions":
        return <EdgeFunctionsSection searchTerm={searchTerm} />;
      case "permissions":
        return <PermissionsSection searchTerm={searchTerm} />;
      case "integrations":
        return <IntegrationsSection searchTerm={searchTerm} />;
      case "tutorials":
        return <TutorialsSection searchTerm={searchTerm} />;
      case "routes":
        return <RoutesSection searchTerm={searchTerm} />;
      case "hooks":
        return <HooksSection searchTerm={searchTerm} />;
      default:
        return <OverviewSection searchTerm={searchTerm} />;
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    toast.info("Gerando PDF completo... Isso pode levar alguns segundos.");

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      const addNewPageIfNeeded = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [17, 24, 39]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setTextColor(...color);
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.5;
        
        lines.forEach((line: string) => {
          addNewPageIfNeeded(lineHeight);
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        
        return lines.length * lineHeight;
      };

      // ==================== COVER PAGE ====================
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Matheus Veículos', pageWidth / 2, pageHeight / 2 - 40, { align: 'center' });
      
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Documentação Técnica', pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.text('Sistema de Gestão para Revendas', pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(156, 163, 175);
      const date = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      pdf.text(`Gerado em ${date}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
      pdf.text('v1.0.0', pageWidth / 2, pageHeight - 30, { align: 'center' });

      // ==================== TABLE OF CONTENTS ====================
      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      yPosition = margin;
      addText('Índice', 28, true);
      yPosition += 10;
      
      ALL_SECTIONS.forEach((section, index) => {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`${index + 1}. ${SECTION_TITLES[section]}`, margin, yPosition);
        yPosition += 10;
      });

      // ==================== 1. VISÃO GERAL ====================
      pdf.addPage();
      yPosition = margin;
      addText('1. Visão Geral', 24, true, [37, 99, 235]);
      yPosition += 5;
      
      addText('Sobre o Sistema', 16, true);
      yPosition += 3;
      addText('O Matheus Veículos é um sistema completo de gestão para revendas de veículos, desenvolvido com tecnologias modernas para oferecer uma experiência fluida e eficiente na gestão de todo o ciclo de vendas automotivas.', 11);
      yPosition += 8;
      
      addText('Stack Tecnológica', 16, true);
      yPosition += 3;
      addText('• Frontend: React 18 com TypeScript, Vite, Tailwind CSS', 11);
      addText('• Backend: Supabase (PostgreSQL, Auth, Edge Functions, Storage)', 11);
      addText('• UI: shadcn/ui, Radix UI, Lucide Icons', 11);
      addText('• Integrações: Evolution API (WhatsApp), Meta Ads, Google Ads', 11);
      yPosition += 8;
      
      addText('Principais Funcionalidades', 16, true);
      yPosition += 3;
      addText('• CRM completo com pipeline de leads e negociações', 11);
      addText('• Gestão de estoque com custos e simulação de venda', 11);
      addText('• Dashboard de vendas com métricas em tempo real', 11);
      addText('• Sistema financeiro com DRE e fluxo de caixa', 11);
      addText('• Integração WhatsApp para atendimento automatizado', 11);
      addText('• Comissões automáticas com regras configuráveis', 11);
      addText('• Marketing integrado com Meta e Google Ads', 11);

      // ==================== 2. MÓDULOS DO SISTEMA ====================
      pdf.addPage();
      yPosition = margin;
      addText('2. Módulos do Sistema', 24, true, [37, 99, 235]);
      yPosition += 8;

      const modules = [
        { name: 'CRM / Leads', route: '/crm', description: 'Gestão de leads, pipeline de negociações, follow-ups automatizados, alertas de veículos.', tables: 'leads, lead_interactions, lead_assignments, negotiations, customers' },
        { name: 'Estoque', route: '/estoque', description: 'Cadastro de veículos, controle de custos, fotos, simulador de venda, DRE por veículo.', tables: 'vehicles, vehicle_images, vehicle_costs, vehicle_simulations' },
        { name: 'Vendas', route: '/vendas', description: 'Dashboard de vendas, aprovações, visão de equipe, lucro, métricas de performance.', tables: 'sales, sale_payment_methods, sale_commissions' },
        { name: 'Financeiro', route: '/financeiro', description: 'Transações, fluxo de caixa, DRE geral, lucratividade, alertas financeiros.', tables: 'financial_transactions, financial_categories' },
        { name: 'Marketing', route: '/marketing', description: 'Campanhas internas, integração Meta Ads e Google Ads, métricas de ROI.', tables: 'marketing_campaigns, meta_campaigns, google_campaigns, channel_costs' },
        { name: 'Comissões', route: '/comissoes', description: 'Regras de comissão, metas por vendedor, ranking, simulador, histórico.', tables: 'commission_rules, salesperson_goals, sale_commissions' },
        { name: 'WhatsApp', route: '/whatsapp', description: 'Instâncias Evolution API, conversas, templates, webhook para criação de leads.', tables: 'whatsapp_instances, whatsapp_contacts, whatsapp_messages' },
        { name: 'Configurações', route: '/configuracoes', description: 'Gestão de usuários, permissões, roles, logs de atividade.', tables: 'profiles, user_roles, user_permissions, activity_logs' }
      ];

      modules.forEach((mod) => {
        addNewPageIfNeeded(35);
        addText(mod.name, 14, true);
        yPosition += 2;
        pdf.setTextColor(107, 114, 128);
        addText(`Rota: ${mod.route}`, 10);
        pdf.setTextColor(17, 24, 39);
        addText(mod.description, 11);
        pdf.setTextColor(107, 114, 128);
        addText(`Tabelas: ${mod.tables}`, 9);
        yPosition += 6;
      });

      // ==================== 3. BANCO DE DADOS ====================
      pdf.addPage();
      yPosition = margin;
      addText('3. Banco de Dados', 24, true, [37, 99, 235]);
      yPosition += 5;
      addText('O sistema utiliza PostgreSQL via Supabase com 54 tabelas, 3 views e 16 funções.', 11);
      yPosition += 8;

      addText('3.1 Tabelas por Categoria', 16, true);
      yPosition += 5;

      const tableCategories = [
        { category: 'CRM', tables: 'leads, lead_interactions, lead_assignments, lead_costs, negotiations, customers' },
        { category: 'Vendas', tables: 'sales, sale_payment_methods, sale_commissions, commission_splits' },
        { category: 'Veículos', tables: 'vehicles, vehicle_images, vehicle_costs, vehicle_simulations, vehicle_interest_alerts' },
        { category: 'Financeiro', tables: 'financial_transactions, financial_categories' },
        { category: 'Comissões', tables: 'commission_rules, commission_audit_log, salesperson_goals' },
        { category: 'Marketing', tables: 'marketing_campaigns, marketing_alerts, campaign_events, channel_costs' },
        { category: 'Meta Ads', tables: 'meta_campaigns, meta_adsets, meta_ads, meta_insights, meta_sync_logs' },
        { category: 'Google Ads', tables: 'google_campaigns, google_ad_groups, google_ads, google_insights, google_sync_logs' },
        { category: 'WhatsApp', tables: 'whatsapp_instances, whatsapp_contacts, whatsapp_messages, whatsapp_templates' },
        { category: 'Follow-up', tables: 'follow_up_flows, follow_up_executions, loss_recovery_rules, loss_recovery_executions' },
        { category: 'Sistema', tables: 'profiles, user_roles, user_permissions, activity_logs, notifications, round_robin_config' }
      ];

      tableCategories.forEach((cat) => {
        addNewPageIfNeeded(15);
        addText(`${cat.category}:`, 12, true);
        addText(cat.tables, 10, false, [107, 114, 128]);
        yPosition += 4;
      });

      yPosition += 5;
      addText('3.2 Views', 16, true);
      yPosition += 3;
      addText('• sale_profit_report - Relatório de lucro por venda com cálculo automático', 11);
      addText('• salesperson_ranking - Ranking de vendedores por performance', 11);
      addText('• vehicle_dre - DRE completo por veículo', 11);

      addNewPageIfNeeded(60);
      yPosition += 8;
      addText('3.3 Funções do Banco', 16, true);
      yPosition += 3;

      const dbFunctions = [
        'has_role(role_name) - Verifica se usuário tem role específica',
        'has_permission(module, permission) - Verifica permissões por módulo',
        'is_master_user() - Verifica se é usuário master',
        'get_user_permissions() - Retorna todas permissões do usuário',
        'create_notification() - Cria notificação para usuário',
        'log_activity() - Registra atividade no sistema',
        'handle_new_user() - Trigger ao criar novo usuário',
        'notify_new_lead() - Notifica vendedor sobre novo lead',
        'update_lead_first_response() - Atualiza primeiro contato do lead',
        'update_lead_status_on_sale() - Atualiza status quando venda é feita',
        'update_vehicle_status_on_sale() - Atualiza veículo quando vendido',
        'generate_commission_on_sale_completion() - Gera comissão automática',
        'get_next_round_robin_salesperson() - Próximo vendedor no rodízio',
        'increment_round_robin_counters() - Incrementa contadores RR',
        'reset_daily_lead_counts() - Reset diário de contadores'
      ];

      dbFunctions.forEach((fn) => {
        addNewPageIfNeeded(8);
        addText(`• ${fn}`, 10);
      });

      // ==================== 4. EDGE FUNCTIONS ====================
      pdf.addPage();
      yPosition = margin;
      addText('4. Edge Functions', 24, true, [37, 99, 235]);
      yPosition += 5;
      addText('Funções serverless executadas no Supabase Edge Runtime (Deno).', 11);
      yPosition += 8;

      const edgeFunctions = [
        { name: 'create-user', method: 'POST', desc: 'Cria novos usuários no sistema (apenas gerentes)', auth: 'Sim' },
        { name: 'sync-users', method: 'POST', desc: 'Sincroniza usuários do auth com profiles', auth: 'Sim' },
        { name: 'update-user-auth', method: 'POST', desc: 'Atualiza email/senha de usuários', auth: 'Sim' },
        { name: 'whatsapp-instance', method: 'POST', desc: 'Gerencia instâncias Evolution API (criar, status, QR)', auth: 'Sim' },
        { name: 'whatsapp-send', method: 'POST', desc: 'Envia mensagens via WhatsApp', auth: 'Sim' },
        { name: 'whatsapp-webhook', method: 'POST', desc: 'Recebe webhooks do WhatsApp, cria leads via Round Robin', auth: 'Não' },
        { name: 'meta-ads-sync', method: 'POST', desc: 'Sincroniza campanhas e métricas do Meta Ads', auth: 'Sim' },
        { name: 'google-ads-sync', method: 'POST', desc: 'Sincroniza campanhas do Google Ads', auth: 'Sim' },
        { name: 'import-vehicles', method: 'POST', desc: 'Importa veículos em lote via CSV/JSON', auth: 'Sim' },
        { name: 'import-vehicle-photos', method: 'POST', desc: 'Importa fotos de veículos de URLs', auth: 'Sim' },
        { name: 'generate-report', method: 'POST', desc: 'Gera relatórios com IA (OpenAI)', auth: 'Sim' }
      ];

      edgeFunctions.forEach((fn) => {
        addNewPageIfNeeded(20);
        addText(fn.name, 12, true);
        addText(`Método: ${fn.method} | Auth: ${fn.auth}`, 10, false, [107, 114, 128]);
        addText(fn.desc, 11);
        yPosition += 5;
      });

      // ==================== 5. SISTEMA DE PERMISSÕES ====================
      pdf.addPage();
      yPosition = margin;
      addText('5. Sistema de Permissões', 24, true, [37, 99, 235]);
      yPosition += 8;

      addText('5.1 Roles (Funções)', 16, true);
      yPosition += 3;
      addText('• Gerente - Acesso total a todos os módulos e funcionalidades', 11);
      addText('• Vendedor - CRM (criar/editar), Vendas (visualizar), Estoque (visualizar), Comissões (próprias)', 11);
      addText('• Marketing - CRM (criar/editar), Marketing (gerenciar), Vendas (visualizar métricas)', 11);
      yPosition += 8;

      addText('5.2 Módulos', 16, true);
      yPosition += 3;
      addText('CRM, Vendas, Estoque, Financeiro, Marketing, Comissões, Configurações, Usuários', 11);
      yPosition += 8;

      addText('5.3 Tipos de Permissão', 16, true);
      yPosition += 3;
      addText('• view - Visualizar dados do módulo', 11);
      addText('• create - Criar novos registros', 11);
      addText('• edit - Editar registros existentes', 11);
      addText('• delete - Excluir registros', 11);
      addText('• manage - Acesso administrativo completo', 11);
      yPosition += 8;

      addText('5.4 Verificação de Permissões', 16, true);
      yPosition += 3;
      addText('Usuários master (is_master = true) têm acesso total automaticamente.', 11);
      addText('Para demais usuários, o sistema verifica: user_roles + user_permissions.', 11);
      addText('Hook usePermissions() fornece funções: hasPermission(), hasRole(), canAccess().', 11);

      // ==================== 6. INTEGRAÇÕES EXTERNAS ====================
      pdf.addPage();
      yPosition = margin;
      addText('6. Integrações Externas', 24, true, [37, 99, 235]);
      yPosition += 8;

      addText('6.1 Evolution API (WhatsApp)', 16, true);
      yPosition += 3;
      addText('API para integração com WhatsApp Business via instâncias QR Code.', 11);
      yPosition += 3;
      addText('Funcionalidades:', 12, true);
      addText('• Criar e gerenciar múltiplas instâncias WhatsApp', 11);
      addText('• Gerar QR Code para conexão', 11);
      addText('• Enviar mensagens de texto e mídia', 11);
      addText('• Receber mensagens via webhook', 11);
      addText('• Criação automática de leads via Round Robin', 11);
      yPosition += 3;
      addText('Secrets: EVOLUTION_API_URL, EVOLUTION_API_KEY', 10, false, [107, 114, 128]);
      yPosition += 8;

      addText('6.2 Meta Ads (Facebook/Instagram)', 16, true);
      yPosition += 3;
      addText('Sincronização de campanhas publicitárias do Facebook e Instagram.', 11);
      yPosition += 3;
      addText('Funcionalidades:', 12, true);
      addText('• Sincronizar campanhas, conjuntos de anúncios e anúncios', 11);
      addText('• Importar métricas: impressões, cliques, CTR, CPC, conversões', 11);
      addText('• Vincular leads a campanhas específicas', 11);
      addText('• Calcular ROI por campanha', 11);
      yPosition += 3;
      addText('Secrets: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_APP_ID, META_APP_SECRET', 10, false, [107, 114, 128]);
      yPosition += 8;

      addText('6.3 Google Ads', 16, true);
      yPosition += 3;
      addText('Sincronização de campanhas do Google Ads.', 11);
      yPosition += 3;
      addText('Funcionalidades:', 12, true);
      addText('• Sincronizar campanhas e grupos de anúncios', 11);
      addText('• Importar métricas de performance', 11);
      addText('• Acompanhar conversões e custo por lead', 11);
      yPosition += 3;
      addText('Secrets: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, etc.', 10, false, [107, 114, 128]);

      // ==================== 7. TUTORIAIS ====================
      pdf.addPage();
      yPosition = margin;
      addText('7. Tutoriais de Uso', 24, true, [37, 99, 235]);
      yPosition += 8;

      const tutorials = [
        {
          title: '7.1 Como criar um usuário',
          steps: [
            '1. Acesse Configurações → Usuários',
            '2. Clique em "Novo Usuário"',
            '3. Preencha nome, email e senha',
            '4. Selecione as roles (Gerente, Vendedor, Marketing)',
            '5. Configure permissões adicionais se necessário',
            '6. Clique em "Criar Usuário"'
          ]
        },
        {
          title: '7.2 Como configurar Round Robin',
          steps: [
            '1. Acesse Configurações → Round Robin',
            '2. Ative os vendedores que receberão leads',
            '3. Defina prioridade de cada vendedor',
            '4. Configure limite diário de leads (opcional)',
            '5. Os leads do WhatsApp serão distribuídos automaticamente'
          ]
        },
        {
          title: '7.3 Como configurar WhatsApp',
          steps: [
            '1. Acesse módulo WhatsApp → Instâncias',
            '2. Clique em "Nova Instância"',
            '3. Digite um nome identificador',
            '4. Clique em "Gerar QR Code"',
            '5. Escaneie o QR com seu WhatsApp',
            '6. Configure o webhook para receber mensagens'
          ]
        },
        {
          title: '7.4 Como registrar uma venda',
          steps: [
            '1. Acesse Vendas → Nova Venda (ou converta negociação)',
            '2. Selecione o veículo e cliente',
            '3. Defina preço de venda e forma de pagamento',
            '4. Adicione custos (documentação, transferência)',
            '5. O sistema calcula lucro e comissão automaticamente',
            '6. Confirme a venda'
          ]
        }
      ];

      tutorials.forEach((tutorial) => {
        addNewPageIfNeeded(50);
        addText(tutorial.title, 14, true);
        yPosition += 3;
        tutorial.steps.forEach((step) => {
          addText(step, 11);
        });
        yPosition += 8;
      });

      // ==================== 8. ROTAS DA APLICAÇÃO ====================
      addNewPageIfNeeded(80);
      addText('8. Rotas da Aplicação', 24, true, [37, 99, 235]);
      yPosition += 5;

      addText('Rotas Públicas:', 14, true);
      addText('/ - Página inicial pública', 11);
      addText('/estoque-publico - Catálogo de veículos', 11);
      addText('/veiculo/:id - Detalhes do veículo', 11);
      addText('/sobre - Sobre a empresa', 11);
      addText('/contato - Formulário de contato', 11);
      addText('/auth - Login/Registro', 11);
      yPosition += 5;

      addText('Rotas Protegidas:', 14, true);
      addText('/dashboard - Dashboard principal', 11);
      addText('/crm/* - Módulo CRM (leads, negociações, follow-ups)', 11);
      addText('/estoque - Gestão de estoque', 11);
      addText('/vendas/* - Módulo de vendas', 11);
      addText('/financeiro/* - Módulo financeiro', 11);
      addText('/marketing/* - Módulo de marketing', 11);
      addText('/comissoes/* - Módulo de comissões', 11);
      addText('/whatsapp/* - Módulo WhatsApp', 11);
      addText('/configuracoes - Configurações gerais', 11);
      addText('/documentacao - Esta documentação (apenas gerentes)', 11);

      // ==================== 9. HOOKS ====================
      pdf.addPage();
      yPosition = margin;
      addText('9. Hooks Personalizados', 24, true, [37, 99, 235]);
      yPosition += 5;
      addText('O sistema possui 31 hooks customizados para gerenciar dados e lógica de negócio.', 11);
      yPosition += 8;

      const hookCategories = [
        { category: 'CRM', hooks: 'useLeads, useNegotiations, useCustomers, useLeadInteractions, useFollowUpFlows, useLossRecoveryRules' },
        { category: 'Vendas', hooks: 'useSales, useSalesperson, useSalesTeamMetrics' },
        { category: 'Estoque', hooks: 'useVehicles, usePublicVehicles, useVehicleInterestAlerts' },
        { category: 'Financeiro', hooks: 'useFinancial, useFinancialTransactions, useFinancialSync' },
        { category: 'Comissões', hooks: 'useCommissions, useCommissionsComplete' },
        { category: 'Marketing', hooks: 'useMarketing, useMarketingCockpit, useMetaAds, useGoogleAds, useCompleteLeadOrigin, useAutomotiveKPIs' },
        { category: 'WhatsApp', hooks: 'useWhatsApp' },
        { category: 'Sistema', hooks: 'useUsers, usePermissions, useNotifications, useRoundRobin' }
      ];

      hookCategories.forEach((cat) => {
        addNewPageIfNeeded(15);
        addText(`${cat.category}:`, 12, true);
        addText(cat.hooks, 10, false, [107, 114, 128]);
        yPosition += 5;
      });

      // ==================== FINAL PAGE ====================
      pdf.addPage();
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Matheus Veículos', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Documentação Técnica Completa', pageWidth / 2, pageHeight / 2, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text('Sistema desenvolvido com React, TypeScript e Supabase', pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
      pdf.text(`© ${new Date().getFullYear()} Matheus Veículos - Todos os direitos reservados`, pageWidth / 2, pageHeight - 30, { align: 'center' });

      // Add page numbers to all pages except cover and final
      const totalPages = pdf.getNumberOfPages();
      for (let i = 2; i < totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Página ${i - 1} de ${totalPages - 2}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Matheus Veículos - Documentação Técnica', margin, pageHeight - 10);
      }

      // Save PDF
      pdf.save('matheus-veiculos-documentacao-tecnica.pdf');
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="font-bold text-lg">Documentação</h1>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={exportToPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <DocumentationNav 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </ScrollArea>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-5xl" ref={contentRef}>
          {renderSection()}
        </div>
      </ScrollArea>
    </div>
  );
};
