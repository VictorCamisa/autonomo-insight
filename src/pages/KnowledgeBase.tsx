import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, BookOpen, Pencil, Trash2, Eye, EyeOff, HelpCircle, FileText, MessageSquare, AlertTriangle, Settings2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { KNOWLEDGE_CATEGORIES } from '@/types/ai-agents';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface KnowledgeItem {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  faq: HelpCircle,
  policy: FileText,
  script: MessageSquare,
  objections: AlertTriangle,
  custom: Settings2,
};

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'faq',
      is_active: true,
    },
  });

  // Fetch main agent
  const { data: agent, isLoading: agentLoading } = useQuery({
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

  // Fetch knowledge items
  const { data: knowledgeItems = [], isLoading: knowledgeLoading } = useQuery({
    queryKey: ['agent-knowledge', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('ai_agent_knowledge')
        .select('*')
        .eq('agent_id', agent.id)
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      if (error) throw error;
      return data as KnowledgeItem[];
    },
    enabled: !!agent?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('ai_agent_knowledge').insert([{
        agent_id: agent!.id,
        title: data.title,
        content: data.content,
        category: data.category,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-knowledge'] });
      toast.success('Conhecimento criado com sucesso!');
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error('Erro ao criar conhecimento');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from('ai_agent_knowledge')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-knowledge'] });
      toast.success('Conhecimento atualizado!');
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast.error('Erro ao atualizar');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agent_knowledge')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-knowledge'] });
      toast.success('Conhecimento removido!');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Erro ao remover');
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_agent_knowledge')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-knowledge'] });
    },
    onError: () => {
      toast.error('Erro ao alterar status');
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({
      title: '',
      content: '',
      category: 'faq',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: KnowledgeItem) => {
    setEditingItem(item);
    form.reset({
      title: item.title,
      content: item.content,
      category: item.category,
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryLabel = (category: string) => {
    return KNOWLEDGE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  // Group by category
  const groupedKnowledge = knowledgeItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItem[]>);

  if (agentLoading || knowledgeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
            </div>
            <p className="text-muted-foreground">
              Adicione informações que a IA usará para responder - FAQs, políticas, scripts, etc.
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Conhecimento
        </Button>
      </div>

      {/* Content */}
      {knowledgeItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum conhecimento cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione FAQs, políticas e scripts para a IA usar nas respostas
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Conhecimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedKnowledge).map(([category, items]) => {
            const Icon = categoryIcons[category] || Settings2;
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">{getCategoryLabel(category)}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
                            >
                              {item.is_active ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Conhecimento' : 'Novo Conhecimento'}
            </DialogTitle>
            <DialogDescription>
              Adicione informações que a IA usará para responder os leads
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
                        placeholder="Descreva o conhecimento que a IA deve usar..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Conhecimento será usado pela IA
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? 'Salvar' : 'Criar'}
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
            <AlertDialogTitle>Remover conhecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O conhecimento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
