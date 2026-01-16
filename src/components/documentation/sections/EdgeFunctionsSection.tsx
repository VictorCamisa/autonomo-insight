import { SectionHeader } from "../ui/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Key } from "lucide-react";
import { CodeBlock } from "../ui/CodeBlock";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface EdgeFunctionsSectionProps {
  searchTerm: string;
}

const edgeFunctions = [
  {
    name: "create-user",
    description: "Cria novos usuários no sistema (apenas gerentes podem usar)",
    method: "POST",
    auth: "Requer autenticação + role gerente",
    secrets: ["SUPABASE_SERVICE_ROLE_KEY"],
    requestBody: `{
  "email": "usuario@email.com",
  "password": "senha123",
  "fullName": "Nome Completo",
  "role": "vendedor"
}`,
    response: `{
  "user": { "id": "uuid", "email": "..." },
  "profile": { "id": "uuid", "full_name": "..." }
}`,
  },
  {
    name: "sync-users",
    description: "Sincroniza usuários do auth com tabela profiles",
    method: "POST",
    auth: "Requer autenticação + role gerente",
    secrets: ["SUPABASE_SERVICE_ROLE_KEY"],
    requestBody: "{}",
    response: `{
  "synced": 5,
  "created": 2,
  "updated": 3
}`,
  },
  {
    name: "update-user-auth",
    description: "Atualiza email ou senha de usuário existente",
    method: "POST",
    auth: "Requer autenticação + role gerente",
    secrets: ["SUPABASE_SERVICE_ROLE_KEY"],
    requestBody: `{
  "userId": "uuid",
  "email": "novo@email.com",
  "password": "novaSenha123"
}`,
    response: `{ "success": true }`,
  },
  {
    name: "whatsapp-instance",
    description: "Gerencia instâncias do WhatsApp via Evolution API (criar, conectar, status, QR code)",
    method: "POST",
    auth: "Requer autenticação",
    secrets: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"],
    requestBody: `{
  "action": "create" | "connect" | "status" | "logout" | "delete",
  "instanceName": "minha-instancia",
  "instanceId": "uuid" // para ações em instância existente
}`,
    response: `{
  "success": true,
  "instance": { ... },
  "qrcode": "base64..." // quando action=connect
}`,
  },
  {
    name: "whatsapp-send",
    description: "Envia mensagens via WhatsApp através da Evolution API",
    method: "POST",
    auth: "Requer autenticação",
    secrets: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"],
    requestBody: `{
  "instanceId": "uuid",
  "number": "5511999999999",
  "text": "Mensagem a enviar"
}`,
    response: `{
  "success": true,
  "messageId": "..."
}`,
  },
  {
    name: "whatsapp-webhook",
    description: "Recebe webhooks do WhatsApp, processa mensagens e cria leads automaticamente via Round Robin",
    method: "POST",
    auth: "Público (webhook)",
    secrets: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"],
    requestBody: `// Payload enviado pela Evolution API
{
  "event": "messages.upsert",
  "instance": "nome-instancia",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "message": { "conversation": "Olá!" },
    "pushName": "Nome do Contato"
  }
}`,
    response: `{ "success": true }`,
    notes: "Cria lead automaticamente se número não existe. Atribui via Round Robin. Registra mensagem.",
  },
  {
    name: "meta-ads-sync",
    description: "Sincroniza campanhas, adsets, ads e insights do Meta Ads (Facebook/Instagram)",
    method: "POST",
    auth: "Requer autenticação + role marketing ou gerente",
    secrets: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_APP_ID", "META_APP_SECRET"],
    requestBody: `{
  "syncType": "full" | "campaigns" | "insights"
}`,
    response: `{
  "success": true,
  "campaigns": 10,
  "adsets": 25,
  "ads": 50,
  "insights": 100
}`,
  },
  {
    name: "google-ads-sync",
    description: "Sincroniza campanhas, ad groups, ads e métricas do Google Ads",
    method: "POST",
    auth: "Requer autenticação + role marketing ou gerente",
    secrets: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_REFRESH_TOKEN"],
    requestBody: `{
  "syncType": "full" | "campaigns" | "metrics"
}`,
    response: `{
  "success": true,
  "campaigns": 5,
  "adGroups": 15,
  "ads": 30,
  "insights": 60
}`,
  },
  {
    name: "import-vehicles",
    description: "Importa veículos em lote a partir de arquivo CSV/JSON",
    method: "POST",
    auth: "Requer autenticação + role gerente",
    secrets: [],
    requestBody: `{
  "vehicles": [
    {
      "brand": "Toyota",
      "model": "Corolla",
      "year_manufacture": 2022,
      ...
    }
  ]
}`,
    response: `{
  "success": true,
  "imported": 10,
  "errors": []
}`,
  },
  {
    name: "import-vehicle-photos",
    description: "Importa fotos de veículos a partir de URLs externas",
    method: "POST",
    auth: "Requer autenticação",
    secrets: [],
    requestBody: `{
  "vehicleId": "uuid",
  "urls": ["https://...", "https://..."]
}`,
    response: `{
  "success": true,
  "imported": 5
}`,
  },
  {
    name: "generate-report",
    description: "Gera relatórios com IA baseado em perguntas do usuário",
    method: "POST",
    auth: "Requer autenticação",
    secrets: ["OPENAI_API_KEY"],
    requestBody: `{
  "question": "Qual foi o faturamento do mês?"
}`,
    response: `{
  "success": true,
  "report": "Relatório gerado..."
}`,
  },
];

const configuredSecrets = [
  { name: "SUPABASE_URL", description: "URL do projeto Supabase" },
  { name: "SUPABASE_ANON_KEY", description: "Chave pública do Supabase" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Chave de serviço (admin)" },
  { name: "SUPABASE_DB_URL", description: "URL de conexão direta ao banco" },
  { name: "SUPABASE_PUBLISHABLE_KEY", description: "Chave publicável" },
  { name: "EVOLUTION_API_URL", description: "URL da Evolution API (WhatsApp)" },
  { name: "EVOLUTION_API_KEY", description: "Chave de API da Evolution" },
  { name: "META_ACCESS_TOKEN", description: "Token de acesso Meta Ads" },
  { name: "META_AD_ACCOUNT_ID", description: "ID da conta de anúncios Meta" },
  { name: "META_APP_ID", description: "ID do app Meta" },
  { name: "META_APP_SECRET", description: "Secret do app Meta" },
  { name: "GOOGLE_ADS_CLIENT_ID", description: "Client ID Google Ads" },
  { name: "GOOGLE_ADS_CLIENT_SECRET", description: "Client Secret Google Ads" },
  { name: "GOOGLE_ADS_DEVELOPER_TOKEN", description: "Token de desenvolvedor" },
  { name: "GOOGLE_ADS_CUSTOMER_ID", description: "ID do cliente Google Ads" },
  { name: "GOOGLE_ADS_REFRESH_TOKEN", description: "Refresh token OAuth" },
  { name: "OPENAI_API_KEY", description: "API Key da OpenAI para IA" },
];

export const EdgeFunctionsSection = ({ searchTerm }: EdgeFunctionsSectionProps) => {
  const filteredFunctions = edgeFunctions.filter(
    (f) =>
      !searchTerm ||
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Edge Functions"
        description="Funções serverless executadas no Supabase Edge (Deno)"
        icon={Cloud}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Secrets Configurados
          </CardTitle>
          <CardDescription>
            Variáveis de ambiente disponíveis nas Edge Functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {configuredSecrets.map((secret) => (
              <div key={secret.name} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Badge variant="outline" className="font-mono text-xs">
                  {secret.name}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">{secret.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        {filteredFunctions.map((func) => (
          <AccordionItem key={func.name} value={func.name} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge variant={func.method === "POST" ? "default" : "secondary"}>
                  {func.method}
                </Badge>
                <span className="font-mono font-semibold">{func.name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{func.description}</p>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Auth:</span>
                <Badge variant="outline">{func.auth}</Badge>
              </div>

              {func.secrets.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Secrets utilizados:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {func.secrets.map((s) => (
                      <Badge key={s} variant="secondary" className="font-mono text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <CodeBlock code={func.requestBody} language="json" title="Request Body" />
                <CodeBlock code={func.response} language="json" title="Response" />
              </div>

              {func.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Notas:</span>
                  <p className="text-sm text-muted-foreground mt-1">{func.notes}</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
