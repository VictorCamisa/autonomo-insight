import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Settings as SettingsIcon, Users, History, Brain } from 'lucide-react';
import { WhatsAppInstances } from '@/components/whatsapp/WhatsAppInstances';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagement } from '@/components/users';
import { ActivityLogsPage } from '@/components/users/ActivityLogsPage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Lightbulb, FileText, MessageCircle } from 'lucide-react';

// ID do Matheus - único administrador
const ADMIN_USER_ID = '6c6e6c96-41d1-4ccc-a8d7-bbe1d1e62336';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.id === ADMIN_USER_ID;

  // Fetch the first/main AI agent
  const { data: agent } = useQuery({
    queryKey: ['main-ai-agent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? 'usuarios' : 'whatsapp'} className="space-y-4">
        <TabsList>
          {isAdmin && (
            <>
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <>
            <TabsContent value="usuarios">
              <UserManagement />
            </TabsContent>

            <TabsContent value="historico">
              <ActivityLogsPage />
            </TabsContent>
          </>
        )}

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integração WhatsApp</CardTitle>
              <CardDescription>
                Configure a conexão com o Evolution API para enviar e receber mensagens diretamente no CRM.
                O chat aparecerá na ficha de cada lead.
              </CardDescription>
            </CardHeader>
          </Card>
          <WhatsAppInstances />
        </TabsContent>

        <TabsContent value="ia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Inteligência Artificial
              </CardTitle>
              <CardDescription>
                Gerencie a base de conhecimento da Gabi para melhorar suas respostas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate('/conhecimento')}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Base de Conhecimento</h3>
                        <p className="text-sm text-muted-foreground">
                          FAQs, políticas, scripts e informações que a IA usa para responder
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed opacity-60">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <Lightbulb className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 text-muted-foreground">Identidade & Tom</h3>
                        <p className="text-sm text-muted-foreground">
                          Em breve: personalidade, gênero e estilo de comunicação
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Adicione FAQs, políticas de troca e scripts de vendas para a Gabi responder automaticamente!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configurações gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Em breve: configurações de notificações, horário de atendimento e mais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
