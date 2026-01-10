import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load only essential components
import AppLayout from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/public/PublicLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";

// Lazy load public pages
const Home = lazy(() => import("./pages/Home"));
const PublicEstoque = lazy(() => import("./pages/PublicEstoque"));
const PublicVehicleDetails = lazy(() => import("./pages/PublicVehicleDetails"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Contato = lazy(() => import("./pages/Contato"));

// Lazy load internal pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Inventory = lazy(() => import("./pages/Inventory"));
const VehicleDetails = lazy(() => import("./pages/VehicleDetails"));
const ImportVehicles = lazy(() => import("./pages/ImportVehicles"));
const BulkPhotoUpload = lazy(() => import("./pages/BulkPhotoUpload"));
const CRMHome = lazy(() => import("./pages/CRMHome"));
const CRMAnalytics = lazy(() => import("./pages/CRMAnalytics"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const LostNegotiations = lazy(() => import("./pages/LostNegotiations"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Reports = lazy(() => import("./pages/Reports"));
const Documentation = lazy(() => import("./pages/Documentation"));

// Lazy load layouts
const CRMLayout = lazy(() => import("@/components/crm/CRMLayout").then(m => ({ default: m.CRMLayout })));
const CommissionsLayout = lazy(() => import("@/components/commissions/CommissionsLayout").then(m => ({ default: m.CommissionsLayout })));
const SalesLayout = lazy(() => import("@/components/sales/SalesLayout").then(m => ({ default: m.SalesLayout })));
const FinancialLayout = lazy(() => import("@/components/financial/FinancialLayout").then(m => ({ default: m.FinancialLayout })));
const MarketingLayout = lazy(() => import("@/components/marketing/MarketingLayout"));
const WhatsAppLayout = lazy(() => import("@/components/whatsapp/WhatsAppLayout").then(m => ({ default: m.WhatsAppLayout })));

// Lazy load Marketing pages
const MarketingCockpit = lazy(() => import("@/components/marketing/MarketingCockpit").then(m => ({ default: m.MarketingCockpit })));
const MarketingDashboard = lazy(() => import("@/components/marketing/MarketingDashboard"));
const MarketingCampaignsPage = lazy(() => import("@/components/marketing/MarketingCampaignsPage"));
const MarketingSettingsPage = lazy(() => import("@/components/marketing/MarketingSettingsPage"));
const LeadOriginPanel = lazy(() => import("@/components/marketing/LeadOriginPanel").then(m => ({ default: m.LeadOriginPanel })));
const ComparativeDashboard = lazy(() => import("@/components/marketing/ComparativeDashboard").then(m => ({ default: m.ComparativeDashboard })));
const CampaignCalendar = lazy(() => import("@/components/marketing/CampaignCalendar").then(m => ({ default: m.CampaignCalendar })));
const UTMBuilder = lazy(() => import("@/components/marketing/UTMBuilder").then(m => ({ default: m.UTMBuilder })));
const MarketingAlertsCenter = lazy(() => import("@/components/marketing/MarketingAlertsCenter").then(m => ({ default: m.MarketingAlertsCenter })));
const MarketingReportsPage = lazy(() => import("@/components/marketing/MarketingReportsPage").then(m => ({ default: m.MarketingReportsPage })));
const GoogleAdsDashboard = lazy(() => import("@/components/marketing/GoogleAdsDashboard").then(m => ({ default: m.GoogleAdsDashboard })));

// Lazy load Commission pages
const CommissionDashboard = lazy(() => import("@/components/commissions/CommissionDashboard").then(m => ({ default: m.CommissionDashboard })));
const CommissionRulesPage = lazy(() => import("@/components/commissions/CommissionRulesPage").then(m => ({ default: m.CommissionRulesPage })));
const CommissionGoalsPage = lazy(() => import("@/components/commissions/CommissionGoalsPage").then(m => ({ default: m.CommissionGoalsPage })));
const CommissionRankingPage = lazy(() => import("@/components/commissions/CommissionRankingPage").then(m => ({ default: m.CommissionRankingPage })));

const CommissionHistoryPage = lazy(() => import("@/components/commissions/CommissionHistoryPage").then(m => ({ default: m.CommissionHistoryPage })));
const CommissionSimulatorPage = lazy(() => import("@/components/commissions/CommissionSimulatorPage").then(m => ({ default: m.CommissionSimulatorPage })));

// Lazy load Sales pages
const SalesDashboard = lazy(() => import("@/components/sales/SalesDashboard").then(m => ({ default: m.SalesDashboard })));
const SalesApprovals = lazy(() => import("@/components/sales/SalesApprovals").then(m => ({ default: m.SalesApprovals })));
const SalesListPage = lazy(() => import("@/components/sales/SalesListPage").then(m => ({ default: m.SalesListPage })));
const SalesTeamView = lazy(() => import("@/components/sales/SalesTeamView").then(m => ({ default: m.SalesTeamView })));
const SalesProfitPage = lazy(() => import("@/components/sales/SalesProfitPage").then(m => ({ default: m.SalesProfitPage })));
const SalesMetricsPage = lazy(() => import("@/components/sales/SalesMetricsPage").then(m => ({ default: m.SalesMetricsPage })));
const SalespersonDetail = lazy(() => import("@/pages/SalespersonDetail"));

// Lazy load Financial pages
const FinancialDashboard = lazy(() => import("@/components/financial/FinancialDashboard").then(m => ({ default: m.FinancialDashboard })));
const DREPage = lazy(() => import("@/components/financial/DREPage").then(m => ({ default: m.DREPage })));
const CashFlowPage = lazy(() => import("@/components/financial/CashFlowPage").then(m => ({ default: m.CashFlowPage })));
const ProfitabilityPage = lazy(() => import("@/components/financial/ProfitabilityPage").then(m => ({ default: m.ProfitabilityPage })));
const FinancialCommissionsPage = lazy(() => import("@/components/financial/FinancialCommissionsPage").then(m => ({ default: m.FinancialCommissionsPage })));
const AlertsPage = lazy(() => import("@/components/financial/AlertsPage").then(m => ({ default: m.AlertsPage })));
const TransactionsPage = lazy(() => import("@/components/financial/TransactionsPage").then(m => ({ default: m.TransactionsPage })));

// Lazy load WhatsApp pages
const WhatsAppConversations = lazy(() => import("@/components/whatsapp/WhatsAppConversations").then(m => ({ default: m.WhatsAppConversations })));
const WhatsAppContacts = lazy(() => import("@/components/whatsapp/WhatsAppContacts").then(m => ({ default: m.WhatsAppContacts })));
const WhatsAppTemplates = lazy(() => import("@/components/whatsapp/WhatsAppTemplates").then(m => ({ default: m.WhatsAppTemplates })));
const WhatsAppInstances = lazy(() => import("@/components/whatsapp/WhatsAppInstances").then(m => ({ default: m.WhatsAppInstances })));
const WhatsAppConfig = lazy(() => import("@/components/whatsapp/WhatsAppConfig").then(m => ({ default: m.WhatsAppConfig })));
const WhatsAppManagerDashboard = lazy(() => import("@/components/whatsapp/WhatsAppManagerDashboard").then(m => ({ default: m.WhatsAppManagerDashboard })));
// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Website Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/veiculos" element={<PublicEstoque />} />
                  <Route path="/veiculos/:id" element={<PublicVehicleDetails />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/contato" element={<Contato />} />
                </Route>

                {/* Auth */}
                <Route path="/auth" element={<Auth />} />

                {/* Internal System Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* CRM Routes */}
                  <Route path="/crm" element={
                    <ProtectedRoute requiredModule="crm">
                      <Suspense fallback={<PageLoader />}>
                        <CRMLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={<CRMHome />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="follow-ups" element={<FollowUps />} />
                    <Route path="perdas" element={<LostNegotiations />} />
                    <Route path="analytics" element={<CRMAnalytics />} />
                  </Route>
                  
                  <Route path="/estoque" element={
                    <ProtectedRoute requiredModule="estoque">
                      <Inventory />
                    </ProtectedRoute>
                  } />
                  <Route path="/estoque/:id" element={
                    <ProtectedRoute requiredModule="estoque">
                      <VehicleDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/estoque/importar" element={
                    <ProtectedRoute requiredModule="estoque">
                      <ImportVehicles />
                    </ProtectedRoute>
                  } />
                  <Route path="/estoque/fotos" element={
                    <ProtectedRoute requiredModule="estoque">
                      <BulkPhotoUpload />
                    </ProtectedRoute>
                  } />
                  
                  {/* Sales Routes */}
                  <Route path="/vendas" element={
                    <ProtectedRoute requiredModule="vendas">
                      <Suspense fallback={<PageLoader />}>
                        <SalesLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={<SalesDashboard />} />
                    <Route path="aprovacoes" element={<SalesApprovals />} />
                    <Route path="vendas" element={<SalesListPage />} />
                    <Route path="equipe" element={<SalesTeamView />} />
                    <Route path="equipe/:id" element={<SalespersonDetail />} />
                    <Route path="lucro" element={<SalesProfitPage />} />
                    <Route path="metricas" element={<SalesMetricsPage />} />
                  </Route>
                  
                  {/* Financial Routes */}
                  <Route path="/financeiro" element={
                    <ProtectedRoute requiredModule="financeiro">
                      <Suspense fallback={<PageLoader />}>
                        <FinancialLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={<FinancialDashboard />} />
                    <Route path="lancamentos" element={<TransactionsPage />} />
                    <Route path="dre" element={<DREPage />} />
                    <Route path="fluxo-caixa" element={<CashFlowPage />} />
                    <Route path="rentabilidade" element={<ProfitabilityPage />} />
                    <Route path="comissoes" element={<FinancialCommissionsPage />} />
                    <Route path="alertas" element={<AlertsPage />} />
                  </Route>
                  
                  {/* Marketing Routes - Simplified */}
                  <Route path="/marketing" element={
                    <ProtectedRoute requiredModule="marketing">
                      <Suspense fallback={<PageLoader />}>
                        <MarketingLayout />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Reports Module with AI */}
                  <Route path="/relatorios" element={
                    <ProtectedRoute requiredModule="marketing">
                      <Suspense fallback={<PageLoader />}>
                        <Reports />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Commission Routes */}
                  <Route path="/comissoes" element={
                    <ProtectedRoute requiredModule="comissoes">
                      <Suspense fallback={<PageLoader />}>
                        <CommissionsLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={<CommissionDashboard />} />
                    <Route path="regras" element={<CommissionRulesPage />} />
                    <Route path="metas" element={<CommissionGoalsPage />} />
                    <Route path="ranking" element={<CommissionRankingPage />} />
                    
                    <Route path="historico" element={<CommissionHistoryPage />} />
                    <Route path="simulador" element={<CommissionSimulatorPage />} />
                  </Route>

                  {/* Settings */}
                  <Route path="/configuracoes" element={
                    <ProtectedRoute requiredModule="configuracoes">
                      <Settings />
                    </ProtectedRoute>
                  } />

                  {/* WhatsApp */}
                  <Route path="/whatsapp" element={
                    <ProtectedRoute requiredModule="configuracoes">
                      <Suspense fallback={<PageLoader />}>
                        <WhatsAppLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={<WhatsAppConversations />} />
                    <Route path="painel" element={<WhatsAppManagerDashboard />} />
                    <Route path="contatos" element={<WhatsAppContacts />} />
                    <Route path="templates" element={<WhatsAppTemplates />} />
                    <Route path="instancias" element={<WhatsAppInstances />} />
                    <Route path="config" element={<WhatsAppConfig />} />
                  </Route>

                  {/* Documentation - Manager only */}
                  <Route path="/documentacao" element={
                    <ProtectedRoute requiredModule="configuracoes">
                      <Suspense fallback={<PageLoader />}>
                        <Documentation />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
