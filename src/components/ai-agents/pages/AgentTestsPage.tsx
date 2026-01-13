import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FlaskConical, Play, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent } from '@/hooks/useAIAgents';
import { toast } from 'sonner';

interface Test {
  id: string;
  name: string;
  test_type: string;
  scenario: string;
  expected_outcome: string;
  actual_outcome: string | null;
  passed: boolean | null;
  executed_at: string | null;
}

const TEST_TYPES = [
  { value: 'conversation', label: 'Conversa Simulada' },
  { value: 'tool_call', label: 'Chamada de Ferramenta' },
  { value: 'guardrail', label: 'Teste de Guardrail' },
  { value: 'edge_case', label: 'Caso Extremo' },
];

export default function AgentTestsPage() {
  const { agentId } = useParams();
  const { data: agent, isLoading } = useAIAgent(agentId);
  const [tests, setTests] = useState<Test[]>([
    {
      id: '1',
      name: 'Saudação Inicial',
      test_type: 'conversation',
      scenario: 'Usuário diz: "Olá, quero ver carros"',
      expected_outcome: 'Agente responde com saudação e pergunta sobre preferências',
      actual_outcome: 'Olá! Seja bem-vindo à Matheus Veículos! Que tipo de veículo você está procurando?',
      passed: true,
      executed_at: '2024-01-10T14:30:00Z',
    },
    {
      id: '2',
      name: 'Busca de Veículo',
      test_type: 'tool_call',
      scenario: 'Usuário pede: "Tem Civic 2022?"',
      expected_outcome: 'Agente chama ferramenta de busca com filtros corretos',
      actual_outcome: null,
      passed: null,
      executed_at: null,
    },
    {
      id: '3',
      name: 'Limite de Desconto',
      test_type: 'guardrail',
      scenario: 'Usuário pede: "Me dá 30% de desconto"',
      expected_outcome: 'Agente recusa e oferece alternativas dentro do limite',
      actual_outcome: 'Desculpe, não posso oferecer descontos acima de 10%. Posso verificar outras condições especiais?',
      passed: true,
      executed_at: '2024-01-10T15:00:00Z',
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    test_type: 'conversation',
    scenario: '',
    expected_outcome: '',
  });
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const handleAddTest = () => {
    if (!newTest.name || !newTest.scenario) return;
    
    setTests([
      ...tests,
      {
        id: Date.now().toString(),
        ...newTest,
        actual_outcome: null,
        passed: null,
        executed_at: null,
      },
    ]);
    setNewTest({ name: '', test_type: 'conversation', scenario: '', expected_outcome: '' });
    setDialogOpen(false);
  };

  const runTest = async (testId: string) => {
    setRunningTest(testId);
    
    // Simular execução do teste
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTests(tests.map(t => {
      if (t.id === testId) {
        const passed = Math.random() > 0.3;
        return {
          ...t,
          passed,
          actual_outcome: passed 
            ? 'Resposta gerada conforme esperado' 
            : 'Resposta não corresponde ao esperado',
          executed_at: new Date().toISOString(),
        };
      }
      return t;
    }));
    
    setRunningTest(null);
    toast.success('Teste executado!');
  };

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.id);
    }
    toast.success('Todos os testes foram executados!');
  };

  const removeTest = (id: string) => {
    setTests(tests.filter(t => t.id !== id));
  };

  const getStatusIcon = (passed: boolean | null) => {
    if (passed === null) return <Clock className="h-5 w-5 text-muted-foreground" />;
    if (passed) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getTypeLabel = (type: string) =>
    TEST_TYPES.find(t => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const passedCount = tests.filter(t => t.passed === true).length;
  const failedCount = tests.filter(t => t.passed === false).length;
  const pendingCount = tests.filter(t => t.passed === null).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Testes</h1>
            <p className="text-muted-foreground">
              Valide o comportamento do agente com cenários de teste
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={runAllTests} disabled={runningTest !== null}>
            <Play className="h-4 w-4 mr-2" />
            Executar Todos
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Teste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Teste</DialogTitle>
                <DialogDescription>
                  Defina um cenário de teste para validar o agente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Teste</Label>
                  <Input
                    placeholder="Ex: Teste de Saudação"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newTest.test_type}
                    onValueChange={(value) => setNewTest({ ...newTest, test_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cenário (Input)</Label>
                  <Textarea
                    placeholder="Descreva a entrada do usuário..."
                    value={newTest.scenario}
                    onChange={(e) => setNewTest({ ...newTest, scenario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resultado Esperado</Label>
                  <Textarea
                    placeholder="Descreva o comportamento esperado..."
                    value={newTest.expected_outcome}
                    onChange={(e) => setNewTest({ ...newTest, expected_outcome: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddTest} className="w-full">
                  Criar Teste
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{passedCount}</div>
                <div className="text-sm text-muted-foreground">Passaram</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{failedCount}</div>
                <div className="text-sm text-muted-foreground">Falharam</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>Casos de Teste</CardTitle>
          <CardDescription>
            Execute testes individuais ou todos de uma vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum teste configurado. Crie o primeiro!
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card"
                >
                  {getStatusIcon(test.passed)}
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{test.name}</span>
                      <Badge variant="outline">{getTypeLabel(test.test_type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Cenário:</strong> {test.scenario}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Esperado:</strong> {test.expected_outcome}
                    </p>
                    {test.actual_outcome && (
                      <p className={`text-sm ${test.passed ? 'text-green-600' : 'text-destructive'}`}>
                        <strong>Resultado:</strong> {test.actual_outcome}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runTest(test.id)}
                      disabled={runningTest !== null}
                    >
                      {runningTest === test.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTest(test.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
