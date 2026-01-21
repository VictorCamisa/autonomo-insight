import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  FileSignature,
  Bell,
  Mail,
  Shield,
  Palette
} from 'lucide-react';

export function ContractSettingsPage() {
  const [settings, setSettings] = useState({
    autoNumbering: true,
    emailNotifications: true,
    requireDigitalSignature: false,
    expirationDays: 30,
    companyName: '',
    companyDocument: '',
    companyAddress: '',
  });

  return (
    <div className="p-6 space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>Configure o comportamento padrão dos contratos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Numeração Automática</Label>
              <p className="text-sm text-muted-foreground">Gerar número sequencial automaticamente</p>
            </div>
            <Switch
              checked={settings.autoNumbering}
              onCheckedChange={(checked) => setSettings({ ...settings, autoNumbering: checked })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Dias para Expiração</Label>
            <p className="text-sm text-muted-foreground">Prazo padrão para assinatura do contrato</p>
            <Input
              type="number"
              value={settings.expirationDays}
              onChange={(e) => setSettings({ ...settings, expirationDays: parseInt(e.target.value) })}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Configure alertas e notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por E-mail</Label>
              <p className="text-sm text-muted-foreground">Receber alertas sobre status de contratos</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digital Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Assinatura Digital
          </CardTitle>
          <CardDescription>Configure a assinatura eletrônica de contratos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exigir Assinatura Digital</Label>
              <p className="text-sm text-muted-foreground">Todos os contratos devem ser assinados digitalmente</p>
            </div>
            <Switch
              checked={settings.requireDigitalSignature}
              onCheckedChange={(checked) => setSettings({ ...settings, requireDigitalSignature: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>Informações que aparecem nos contratos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={settings.companyDocument}
                onChange={(e) => setSettings({ ...settings, companyDocument: e.target.value })}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo</Label>
            <Input
              value={settings.companyAddress}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
