import { SectionHeader } from "../ui/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Table2, Eye, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TableSchema } from "../ui/TableSchema";
import { FunctionDoc } from "../ui/FunctionDoc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DatabaseSectionProps {
  searchTerm: string;
}

const tableCategories = [
  {
    name: "CRM & Leads",
    tables: [
      {
        name: "leads",
        description: "Leads de clientes interessados",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "name", type: "TEXT", nullable: false },
          { name: "phone", type: "TEXT", nullable: false },
          { name: "email", type: "TEXT", nullable: true },
          { name: "source", type: "lead_source", nullable: false, defaultValue: "'manual'" },
          { name: "status", type: "lead_status", nullable: false, defaultValue: "'novo'" },
          { name: "assigned_to", type: "UUID", nullable: true },
          { name: "vehicle_interest", type: "TEXT", nullable: true },
          { name: "qualification_status", type: "qualification_status", nullable: true },
          { name: "qualification_reason", type: "TEXT", nullable: true },
          { name: "first_response_at", type: "TIMESTAMPTZ", nullable: true },
          { name: "utm_source", type: "TEXT", nullable: true },
          { name: "utm_medium", type: "TEXT", nullable: true },
          { name: "utm_campaign", type: "TEXT", nullable: true },
          { name: "utm_content", type: "TEXT", nullable: true },
          { name: "meta_campaign_id", type: "UUID", nullable: true },
          { name: "meta_adset_id", type: "UUID", nullable: true },
          { name: "meta_ad_id", type: "UUID", nullable: true },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "created_by", type: "UUID", nullable: true },
        ],
      },
      {
        name: "lead_interactions",
        description: "Histórico de interações com leads",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "lead_id", type: "UUID", nullable: false },
          { name: "user_id", type: "UUID", nullable: true },
          { name: "type", type: "TEXT", nullable: false },
          { name: "description", type: "TEXT", nullable: false },
          { name: "follow_up_date", type: "TIMESTAMPTZ", nullable: true },
          { name: "follow_up_completed", type: "BOOLEAN", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "negotiations",
        description: "Negociações em andamento",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "lead_id", type: "UUID", nullable: false },
          { name: "salesperson_id", type: "UUID", nullable: false },
          { name: "vehicle_id", type: "UUID", nullable: true },
          { name: "customer_id", type: "UUID", nullable: true },
          { name: "status", type: "negotiation_status", nullable: false, defaultValue: "'contato_inicial'" },
          { name: "estimated_value", type: "NUMERIC", nullable: true },
          { name: "probability", type: "INTEGER", nullable: true },
          { name: "expected_close_date", type: "DATE", nullable: true },
          { name: "actual_close_date", type: "DATE", nullable: true },
          { name: "appointment_date", type: "DATE", nullable: true },
          { name: "appointment_time", type: "TEXT", nullable: true },
          { name: "showed_up", type: "BOOLEAN", nullable: true },
          { name: "no_show_count", type: "INTEGER", nullable: true },
          { name: "test_drive_scheduled", type: "BOOLEAN", nullable: true },
          { name: "test_drive_completed", type: "BOOLEAN", nullable: true },
          { name: "contact_attempts", type: "INTEGER", nullable: true },
          { name: "objections", type: "JSONB", nullable: true },
          { name: "loss_reason", type: "TEXT", nullable: true },
          { name: "structured_loss_reason", type: "loss_reason_type", nullable: true },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "customers",
        description: "Clientes cadastrados",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "name", type: "TEXT", nullable: false },
          { name: "phone", type: "TEXT", nullable: false },
          { name: "email", type: "TEXT", nullable: true },
          { name: "cpf_cnpj", type: "TEXT", nullable: true },
          { name: "address", type: "TEXT", nullable: true },
          { name: "city", type: "TEXT", nullable: true },
          { name: "state", type: "TEXT", nullable: true },
          { name: "lead_id", type: "UUID", nullable: true },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
    ],
  },
  {
    name: "Veículos",
    tables: [
      {
        name: "vehicles",
        description: "Estoque de veículos",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "brand", type: "TEXT", nullable: false },
          { name: "model", type: "TEXT", nullable: false },
          { name: "version", type: "TEXT", nullable: true },
          { name: "year_manufacture", type: "INTEGER", nullable: false },
          { name: "year_model", type: "INTEGER", nullable: false },
          { name: "color", type: "TEXT", nullable: false },
          { name: "mileage", type: "INTEGER", nullable: false },
          { name: "fuel", type: "TEXT", nullable: false },
          { name: "transmission", type: "TEXT", nullable: false },
          { name: "plate", type: "TEXT", nullable: true },
          { name: "renavam", type: "TEXT", nullable: true },
          { name: "chassis", type: "TEXT", nullable: true },
          { name: "purchase_price", type: "NUMERIC", nullable: false },
          { name: "sale_price", type: "NUMERIC", nullable: false },
          { name: "status", type: "vehicle_status", nullable: false, defaultValue: "'disponivel'" },
          { name: "fipe_code", type: "TEXT", nullable: true },
          { name: "fipe_price", type: "NUMERIC", nullable: true },
          { name: "features", type: "TEXT[]", nullable: true },
          { name: "description", type: "TEXT", nullable: true },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "entry_date", type: "DATE", nullable: true },
          { name: "category", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "created_by", type: "UUID", nullable: true },
        ],
      },
      {
        name: "vehicle_images",
        description: "Fotos dos veículos",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "vehicle_id", type: "UUID", nullable: false },
          { name: "url", type: "TEXT", nullable: false },
          { name: "is_main", type: "BOOLEAN", nullable: true, defaultValue: "false" },
          { name: "order_index", type: "INTEGER", nullable: true, defaultValue: "0" },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "vehicle_costs",
        description: "Custos adicionais por veículo",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "vehicle_id", type: "UUID", nullable: false },
          { name: "description", type: "TEXT", nullable: false },
          { name: "amount", type: "NUMERIC", nullable: false },
          { name: "category", type: "TEXT", nullable: true },
          { name: "date", type: "DATE", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "created_by", type: "UUID", nullable: true },
        ],
      },
    ],
  },
  {
    name: "Vendas",
    tables: [
      {
        name: "sales",
        description: "Registro de vendas",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "vehicle_id", type: "UUID", nullable: false },
          { name: "customer_id", type: "UUID", nullable: false },
          { name: "salesperson_id", type: "UUID", nullable: false },
          { name: "lead_id", type: "UUID", nullable: true },
          { name: "sale_price", type: "NUMERIC", nullable: false },
          { name: "payment_method", type: "payment_method", nullable: false, defaultValue: "'a_vista'" },
          { name: "payment_details", type: "TEXT", nullable: true },
          { name: "documentation_cost", type: "NUMERIC", nullable: true },
          { name: "transfer_cost", type: "NUMERIC", nullable: true },
          { name: "other_sale_costs", type: "NUMERIC", nullable: true },
          { name: "status", type: "sale_status", nullable: false, defaultValue: "'pendente'" },
          { name: "sale_date", type: "DATE", nullable: false, defaultValue: "now()" },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "sale_payment_methods",
        description: "Formas de pagamento da venda (múltiplas)",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "sale_id", type: "UUID", nullable: false },
          { name: "payment_method", type: "payment_method", nullable: false },
          { name: "amount", type: "NUMERIC", nullable: false },
          { name: "details", type: "TEXT", nullable: true },
          { name: "financing_bank", type: "TEXT", nullable: true },
          { name: "financing_installments", type: "INTEGER", nullable: true },
          { name: "financing_interest_rate", type: "NUMERIC", nullable: true },
          { name: "financing_entry_value", type: "NUMERIC", nullable: true },
          { name: "financing_financed_value", type: "NUMERIC", nullable: true },
          { name: "financing_installment_value", type: "NUMERIC", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: true, defaultValue: "now()" },
        ],
      },
      {
        name: "sale_commissions",
        description: "Comissões geradas por venda",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "sale_id", type: "UUID", nullable: false },
          { name: "user_id", type: "UUID", nullable: false },
          { name: "commission_rule_id", type: "UUID", nullable: true },
          { name: "calculated_amount", type: "NUMERIC", nullable: false, defaultValue: "0" },
          { name: "manual_adjustment", type: "NUMERIC", nullable: true },
          { name: "final_amount", type: "NUMERIC", nullable: false, defaultValue: "0" },
          { name: "split_percentage", type: "NUMERIC", nullable: true },
          { name: "status", type: "TEXT", nullable: true, defaultValue: "'pending'" },
          { name: "paid", type: "BOOLEAN", nullable: false, defaultValue: "false" },
          { name: "paid_at", type: "TIMESTAMPTZ", nullable: true },
          { name: "payment_due_date", type: "DATE", nullable: true },
          { name: "approved_by", type: "UUID", nullable: true },
          { name: "approved_at", type: "TIMESTAMPTZ", nullable: true },
          { name: "rejection_reason", type: "TEXT", nullable: true },
          { name: "notes", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
    ],
  },
  {
    name: "Sistema & Usuários",
    tables: [
      {
        name: "profiles",
        description: "Perfis de usuários do sistema",
        columns: [
          { name: "id", type: "UUID", nullable: false },
          { name: "full_name", type: "TEXT", nullable: true },
          { name: "email", type: "TEXT", nullable: true },
          { name: "avatar_url", type: "TEXT", nullable: true },
          { name: "is_active", type: "BOOLEAN", nullable: false, defaultValue: "true" },
          { name: "is_master", type: "BOOLEAN", nullable: false, defaultValue: "false" },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "user_roles",
        description: "Roles atribuídas aos usuários",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "user_id", type: "UUID", nullable: false },
          { name: "role", type: "app_role", nullable: false },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "user_permissions",
        description: "Permissões específicas por módulo",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "user_id", type: "UUID", nullable: false },
          { name: "module", type: "TEXT", nullable: false },
          { name: "permission", type: "TEXT", nullable: false },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "activity_logs",
        description: "Log de atividades do sistema",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "user_id", type: "UUID", nullable: true },
          { name: "action", type: "TEXT", nullable: false },
          { name: "entity_type", type: "TEXT", nullable: false },
          { name: "entity_id", type: "UUID", nullable: true },
          { name: "details", type: "JSONB", nullable: true },
          { name: "ip_address", type: "TEXT", nullable: true },
          { name: "user_agent", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
      {
        name: "notifications",
        description: "Notificações do sistema",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "user_id", type: "UUID", nullable: false },
          { name: "type", type: "TEXT", nullable: false },
          { name: "title", type: "TEXT", nullable: false },
          { name: "message", type: "TEXT", nullable: false },
          { name: "link", type: "TEXT", nullable: true },
          { name: "read", type: "BOOLEAN", nullable: false, defaultValue: "false" },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
    ],
  },
  {
    name: "WhatsApp",
    tables: [
      {
        name: "whatsapp_instances",
        description: "Instâncias do WhatsApp (Evolution API)",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "name", type: "TEXT", nullable: false },
          { name: "instance_name", type: "TEXT", nullable: false },
          { name: "phone_number", type: "TEXT", nullable: true },
          { name: "status", type: "TEXT", nullable: false, defaultValue: "'disconnected'" },
          { name: "qr_code", type: "TEXT", nullable: true },
          { name: "assigned_to", type: "UUID", nullable: true },
          { name: "webhook_url", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
          { name: "created_by", type: "UUID", nullable: true },
        ],
      },
      {
        name: "whatsapp_messages",
        description: "Mensagens do WhatsApp",
        columns: [
          { name: "id", type: "UUID", nullable: false, defaultValue: "gen_random_uuid()" },
          { name: "instance_id", type: "UUID", nullable: false },
          { name: "contact_id", type: "UUID", nullable: true },
          { name: "remote_jid", type: "TEXT", nullable: false },
          { name: "message_id", type: "TEXT", nullable: true },
          { name: "content", type: "TEXT", nullable: true },
          { name: "message_type", type: "TEXT", nullable: false, defaultValue: "'text'" },
          { name: "direction", type: "TEXT", nullable: false },
          { name: "status", type: "TEXT", nullable: true },
          { name: "media_url", type: "TEXT", nullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "now()" },
        ],
      },
    ],
  },
];

const views = [
  {
    name: "sale_profit_report",
    description: "View que calcula o lucro de cada venda, considerando preço de compra, custos do veículo, custos da venda e comissões",
  },
  {
    name: "salesperson_ranking",
    description: "View que calcula o ranking de vendedores com base em vendas, faturamento e comissões do período",
  },
  {
    name: "vehicle_dre",
    description: "View que gera o DRE (Demonstração de Resultado) individual por veículo",
  },
];

const dbFunctions = [
  {
    name: "has_role",
    description: "Verifica se um usuário possui determinada role",
    parameters: [
      { name: "_user_id", type: "UUID", description: "ID do usuário" },
      { name: "_role", type: "app_role", description: "Role a verificar" },
    ],
    returnType: "BOOLEAN",
    security: "DEFINER" as const,
  },
  {
    name: "has_permission",
    description: "Verifica se usuário tem permissão em módulo (inclui check de master)",
    parameters: [
      { name: "_user_id", type: "UUID" },
      { name: "_module", type: "TEXT" },
      { name: "_permission", type: "TEXT" },
    ],
    returnType: "BOOLEAN",
    security: "DEFINER" as const,
  },
  {
    name: "is_master_user",
    description: "Verifica se é usuário master",
    parameters: [{ name: "_user_id", type: "UUID" }],
    returnType: "BOOLEAN",
    security: "DEFINER" as const,
  },
  {
    name: "get_user_permissions",
    description: "Retorna todas as permissões de um usuário agrupadas por módulo",
    parameters: [{ name: "_user_id", type: "UUID" }],
    returnType: "TABLE(module, permissions[])",
    security: "DEFINER" as const,
  },
  {
    name: "create_notification",
    description: "Cria uma notificação para um usuário",
    parameters: [
      { name: "p_user_id", type: "UUID" },
      { name: "p_type", type: "TEXT" },
      { name: "p_title", type: "TEXT" },
      { name: "p_message", type: "TEXT" },
      { name: "p_link", type: "TEXT", description: "Opcional" },
    ],
    returnType: "UUID",
    security: "DEFINER" as const,
  },
  {
    name: "log_activity",
    description: "Registra uma atividade no log de auditoria",
    parameters: [
      { name: "p_action", type: "TEXT" },
      { name: "p_entity_type", type: "TEXT" },
      { name: "p_entity_id", type: "UUID", description: "Opcional" },
      { name: "p_details", type: "JSONB", description: "Opcional" },
    ],
    returnType: "UUID",
    security: "DEFINER" as const,
  },
  {
    name: "get_next_round_robin_salesperson",
    description: "Retorna o próximo vendedor na fila do Round Robin",
    parameters: [],
    returnType: "UUID",
    security: "DEFINER" as const,
  },
  {
    name: "increment_round_robin_counters",
    description: "Incrementa contadores do Round Robin após atribuição",
    parameters: [{ name: "p_salesperson_id", type: "UUID" }],
    returnType: "VOID",
    security: "DEFINER" as const,
  },
  {
    name: "reset_daily_lead_counts",
    description: "Reseta contadores diários do Round Robin",
    parameters: [],
    returnType: "VOID",
    security: "DEFINER" as const,
  },
  {
    name: "generate_commission_on_sale_completion",
    description: "Trigger que gera comissão automaticamente ao concluir venda",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "update_lead_status_on_sale",
    description: "Trigger que atualiza status do lead para 'convertido' ao vender",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "update_vehicle_status_on_sale",
    description: "Trigger que atualiza status do veículo para 'vendido'",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "update_lead_first_response",
    description: "Trigger que registra primeiro contato com lead",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "notify_new_lead",
    description: "Trigger que notifica vendedor sobre novo lead atribuído",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "handle_new_user",
    description: "Trigger que cria perfil ao criar usuário no auth",
    parameters: [],
    returnType: "TRIGGER",
    security: "DEFINER" as const,
  },
  {
    name: "update_updated_at_column",
    description: "Trigger genérico para atualizar coluna updated_at",
    parameters: [],
    returnType: "TRIGGER",
    security: "INVOKER" as const,
  },
];

const enums = [
  { name: "app_role", values: ["gerente", "vendedor", "marketing"] },
  { name: "lead_source", values: ["website", "whatsapp", "facebook", "instagram", "google_ads", "indicacao", "olx", "webmotors", "outros"] },
  { name: "lead_status", values: ["novo", "contactado", "qualificado", "negociando", "convertido", "perdido", "reativado"] },
  { name: "qualification_status", values: ["hot", "warm", "cold"] },
  { name: "negotiation_status", values: ["atendimento_ia", "negociando", "follow_up", "ganho", "perdido"] },
  { name: "loss_reason_type", values: ["preco", "financiamento", "concorrencia", "desistencia", "veiculo_inadequado", "sem_resposta", "outro"] },
  { name: "vehicle_status", values: ["disponivel", "reservado", "vendido"] },
  { name: "payment_method", values: ["a_vista", "financiamento", "consorcio", "troca", "troca_financiamento"] },
  { name: "sale_status", values: ["pendente", "aprovada", "concluida", "cancelada"] },
  { name: "commission_type", values: ["percentual_venda", "percentual_lucro", "valor_fixo", "escalonado"] },
];

export const DatabaseSection = ({ searchTerm }: DatabaseSectionProps) => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Banco de Dados"
        description="Estrutura completa do banco de dados Supabase (PostgreSQL)"
        icon={Database}
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">54</CardTitle>
            <CardDescription>Tabelas</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">3</CardTitle>
            <CardDescription>Views</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">16</CardTitle>
            <CardDescription>Funções</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables" className="gap-2">
            <Table2 className="h-4 w-4" />
            Tabelas
          </TabsTrigger>
          <TabsTrigger value="views" className="gap-2">
            <Eye className="h-4 w-4" />
            Views
          </TabsTrigger>
          <TabsTrigger value="functions" className="gap-2">
            <Zap className="h-4 w-4" />
            Funções
          </TabsTrigger>
          <TabsTrigger value="enums">Enums</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-4">
          <Accordion type="single" collapsible className="space-y-4">
            {tableCategories.map((category) => (
              <AccordionItem key={category.name} value={category.name} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{category.name}</span>
                    <Badge variant="secondary">{category.tables.length} tabelas</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {category.tables
                    .filter(
                      (t) =>
                        !searchTerm ||
                        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((table) => (
                      <TableSchema
                        key={table.name}
                        tableName={table.name}
                        columns={table.columns}
                        description={table.description}
                      />
                    ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="views" className="mt-4 space-y-4">
          {views.map((view) => (
            <Card key={view.name}>
              <CardHeader>
                <CardTitle className="font-mono text-sm">{view.name}</CardTitle>
                <CardDescription>{view.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="functions" className="mt-4 space-y-4">
          {dbFunctions
            .filter(
              (f) =>
                !searchTerm ||
                f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((func) => (
              <FunctionDoc
                key={func.name}
                name={func.name}
                description={func.description}
                parameters={func.parameters}
                returnType={func.returnType}
                security={func.security}
              />
            ))}
        </TabsContent>

        <TabsContent value="enums" className="mt-4">
          <div className="grid gap-4">
            {enums.map((e) => (
              <Card key={e.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm">{e.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {e.values.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
