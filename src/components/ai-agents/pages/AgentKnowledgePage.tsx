import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  FileQuestion,
  FileText,
  MessageSquareText,
  Building,
  Settings2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useAIAgent } from '@/hooks/useAIAgents';
import { 
  useAgentKnowledge, 
  useCreateAgentKnowledge, 
  useUpdateAgentKnowledge, 
  useDeleteAgentKnowledge,
  useToggleAgentKnowledge 
} from '@/hooks/useAgentKnowledge';
import { KNOWLEDGE_CATEGORIES, type AIAgentKnowledge, type AIAgentKnowledgeFormData } from '@/types/ai-agents';

// Form schema
const formSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  faq: FileQuestion,
  policies: FileText,
  scripts: MessageSquareText,
  about: Building,
  custom: Settings2,
};

export default function AgentKnowledgePage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AIAgentKnowledge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: agent, isLoading: agentLoading } = useAIAgent(agentId);
  const { data: knowledge = [], isLoading: knowledgeLoading } = useAgentKnowledge(agentId);
  
  const createMutation = useCreateAgentKnowledge();
  const updateMutation = useUpdateAgentKnowledge();
  const deleteMutation = useDeleteAgentKnowledge();
  const toggleMutation = useToggleAgentKnowledge();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'custom',
      is_active: true,
    },
  });

  if (!agentId) {
    return (
      <div className="p-6">
        <p className="text-destructive">ID do agente não encontrado</p>
      </div>
    );
  }

  if (agentLoading || knowledgeLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({
      title: '',
      content: '',
      category: 'custom',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: AIAgentKnowledge) => {
    setEditingItem(item);
    form.reset({
      title: item.title,
      content: item.content,
      category: item.category,
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ 
        id: editingItem.id, 
        data: {
          title: data.title,
          content: data.content,
          category: data.category,
          is_active: data.is_active,
        }
      });
    } else {
      await createMutation.mutateAsync({
        agent_id: agentId,
        title: data.title,
        content: data.content,
        category: data.category,
        is_active: data.is_active,
      });
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync({ id: deleteId, agentId });
    setDeleteId(null);
  };

  const handleToggle = (item: AIAgentKnowledge) => {
    toggleMutation.mutate({ id: item.id, is_active: !item.is_active, agentId });
  };

  // Group knowledge by category
  const groupedKnowledge = knowledge.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AIAgentKnowledge[]>);

  const getCategoryLabel = (category: string) => {
    return KNOWLEDGE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground">
            Adicione informações que a IA usará para responder - FAQs, políticas, scripts, etc.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Conhecimento
        </Button>
      </div>

      {/* Empty State */}
      {knowledge.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum conhecimento cadastrado</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Adicione informações que a IA deve saber - FAQs, políticas da loja, scripts de vendas, 
              informações sobre a empresa, etc.
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Conhecimento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Cards by Category */}
      {Object.entries(groupedKnowledge).map(([category, items]) => {
        const IconComponent = categoryIcons[category] || Settings2;
        
        return (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconComponent className="h-5 w-5" />
              {getCategoryLabel(category)}
              <Badge variant="secondary">{items.length}</Badge>
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card 
                  key={item.id} 
                  className={`transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(item)}
                          title={item.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {item.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/ai-agents/${agentId}/memoria`)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar: Memória
        </Button>
        <Button
          onClick={() => navigate(`/ai-agents/${agentId}/ferramentas`)}
          className="gap-2"
        >
          Próximo: Ferramentas
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Conhecimento' : 'Adicionar Conhecimento'}
            </DialogTitle>
            <DialogDescription>
              Adicione informações que a IA usará para responder às perguntas dos clientes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Política de Garantia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KNOWLEDGE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Digite o conteúdo que a IA deve saber..."
                        className="min-h-[200px] font-mono text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Salvando...' 
                    : editingItem ? 'Salvar' : 'Adicionar'
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este conhecimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
