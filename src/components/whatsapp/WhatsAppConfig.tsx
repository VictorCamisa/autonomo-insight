import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Webhook, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function WhatsAppConfig() {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações WhatsApp</h2>
        <p className="text-muted-foreground">
          Configure comportamentos e integrações
        </p>
      </div>

      <div className="grid gap-6">
        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure alertas de novas mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificar novas mensagens</Label>
                <p className="text-sm text-muted-foreground">
                  Receba uma notificação quando chegar nova mensagem
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Som de notificação</Label>
                <p className="text-sm text-muted-foreground">
                  Tocar som ao receber mensagem
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Evolution API
            </CardTitle>
            <CardDescription>
              Configure o webhook para receber mensagens em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input 
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                  }}
                >
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no painel da Evolution API para receber eventos
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Eventos suportados:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• messages.upsert - Novas mensagens</li>
                <li>• messages.update - Status de mensagens</li>
                <li>• connection.update - Status da conexão</li>
                <li>• qrcode.updated - Atualização de QR Code</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Horário de Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Atendimento
            </CardTitle>
            <CardDescription>
              Configure mensagem automática fora do horário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ativar mensagem automática</Label>
                <p className="text-sm text-muted-foreground">
                  Responder automaticamente fora do horário comercial
                </p>
              </div>
              <Switch />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de início</Label>
                <Input type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-2">
                <Label>Horário de término</Label>
                <Input type="time" defaultValue="18:00" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
