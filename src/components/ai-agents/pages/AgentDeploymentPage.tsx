import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rocket, Copy, Check, Globe, MessageSquare, Play, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
import { useWhatsAppInstances } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';
import AgentChatPanel from '../AgentChatPanel';

export default function AgentDeploymentPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const { data: agent, isLoading } = useAIAgent(agentId);
  const { data: whatsappInstances = [], isLoading: isLoadingInstances } = useWhatsAppInstances();
  const updateAgent = useUpdateAIAgent();

  const connectedInstances = whatsappInstances.filter(i => i.status === 'connected');
  const selectedInstanceId = agent?.whatsapp_instance_id;

  const handleSelectInstance = (instanceId: string | null) => {
    updateAgent.mutate({ 
      id: agentId!, 
      data: { whatsapp_instance_id: instanceId } 
    });
  };

  const widgetCode = `<!-- Matheus Veículos AI Agent Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/ai-widget.js';
    script.async = true;
    script.dataset.agentId = '${agentId}';
    document.head.appendChild(script);
  })();
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!agent) return;
    
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    await updateAgent.mutateAsync({ 
      id: agentId!, 
      data: { status: newStatus } 
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Implantação</h1>
            <p className="text-muted-foreground">
              Publique o agente no site ou integre via WhatsApp
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant={agent?.status === 'active' ? 'default' : 'secondary'}
            className={agent?.status === 'active' ? 'bg-green-500' : ''}
          >
            {agent?.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button 
            onClick={handleActivate}
            variant={agent?.status === 'active' ? 'outline' : 'default'}
          >
            {agent?.status === 'active' ? 'Desativar' : 'Ativar Agente'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="test" className="space-y-6">
        <TabsList>
          <TabsTrigger value="test" className="gap-2">
            <Play className="h-4 w-4" />
            Testar
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2">
            <Globe className="h-4 w-4" />
            Widget Web
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Agente</CardTitle>
              <CardDescription>
                Converse com o agente para testar o comportamento antes de publicar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showChat ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Pronto para testar</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Inicie uma conversa de teste para verificar se o agente está funcionando corretamente.
                  </p>
                  <Button onClick={() => setShowChat(true)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Iniciar Conversa de Teste
                  </Button>
                </div>
              ) : (
                <div className="h-[500px]">
                  <AgentChatPanel agentId={agentId!} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget para Site</CardTitle>
              <CardDescription>
                Adicione o widget de chat ao seu site copiando o código abaixo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                  <code>{widgetCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 gap-2"
                  onClick={handleCopyCode}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Como instalar:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Copie o código acima</li>
                  <li>Cole antes do fechamento da tag &lt;/body&gt; do seu site</li>
                  <li>O widget aparecerá no canto inferior direito</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integração WhatsApp</CardTitle>
              <CardDescription>
                Conecte o agente a uma instância do WhatsApp para responder automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instance Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Selecionar Instância</Label>
                {isLoadingInstances ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : connectedInstances.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-muted/50 text-center">
                    <WifiOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma instância conectada. Configure uma instância primeiro.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3 gap-2"
                      onClick={() => navigate('/whatsapp/instancias')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Configurar Instância
                    </Button>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedInstanceId || 'none'}
                    onValueChange={(value) => handleSelectInstance(value === 'none' ? null : value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none" className="flex-1 cursor-pointer">
                        <span className="font-medium">Nenhuma</span>
                        <p className="text-xs text-muted-foreground">
                          Agente não responderá no WhatsApp
                        </p>
                      </Label>
                    </div>
                    
                    {connectedInstances.map((instance) => (
                      <div 
                        key={instance.id} 
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={instance.id} id={instance.id} />
                        <Label htmlFor={instance.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{instance.name}</span>
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                              <Wifi className="h-3 w-3" />
                              Conectado
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {instance.phone_number || 'Número não disponível'}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Auto-reply toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Resposta Automática</Label>
                  <p className="text-xs text-muted-foreground">
                    O agente responde automaticamente novas mensagens
                  </p>
                </div>
                <Switch 
                  checked={agent?.whatsapp_auto_reply} 
                  onCheckedChange={(checked) => 
                    updateAgent.mutate({ id: agentId!, data: { whatsapp_auto_reply: checked } })
                  }
                />
              </div>

              {/* Transfer to human toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Permitir Transferência para Humano</Label>
                  <p className="text-xs text-muted-foreground">
                    Palavras-chave: "falar com humano", "atendente", "vendedor"
                  </p>
                </div>
                <Switch 
                  checked={agent?.transfer_to_human_enabled} 
                  onCheckedChange={(checked) => 
                    updateAgent.mutate({ id: agentId!, data: { transfer_to_human_enabled: checked } })
                  }
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => navigate('/whatsapp/instancias')}
              >
                <ExternalLink className="h-4 w-4" />
                Gerenciar Instâncias WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(`/ai-agents/${agentId}/ferramentas`)}>
          Voltar
        </Button>
        <Button onClick={() => navigate('/ai-agents')}>
          Concluir Configuração
        </Button>
      </div>
    </div>
  );
}
