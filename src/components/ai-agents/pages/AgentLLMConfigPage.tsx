import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Brain, Save, ArrowRight, Eye, EyeOff, CheckCircle, Loader2, Volume2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent, useUpdateAIAgent, useValidateAPIKey } from '@/hooks/useAIAgents';
import { useElevenLabsVoices } from '@/hooks/useElevenLabsVoices';
import { LLM_PROVIDERS, LLM_MODELS, DEFAULT_AGENT } from '@/types/ai-agents';

const formSchema = z.object({
  llm_provider: z.enum(['openai', 'google']),
  llm_model: z.string(),
  api_key_encrypted: z.string().min(1, 'API Key é obrigatória'),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(100).max(8192),
  system_prompt: z.string().optional(),
  enable_voice: z.boolean(),
  voice_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AgentLLMConfigPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [showApiKey, setShowApiKey] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const { data: agent, isLoading } = useAIAgent(agentId);
  const updateAgent = useUpdateAIAgent();
  const validateKey = useValidateAPIKey();
  const { data: voices, isLoading: voicesLoading, error: voicesError } = useElevenLabsVoices();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      llm_provider: 'openai',
      llm_model: 'gpt-4o-mini',
      api_key_encrypted: '',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: DEFAULT_AGENT.system_prompt || '',
      enable_voice: false,
      voice_id: 'sB6li6v6ltCgOxFxqdo5',
    },
  });

  const selectedProvider = form.watch('llm_provider');
  const availableModels = LLM_MODELS[selectedProvider] || [];

  useEffect(() => {
    if (agent) {
      form.reset({
        llm_provider: agent.llm_provider as 'openai' | 'google',
        llm_model: agent.llm_model,
        api_key_encrypted: agent.api_key_encrypted || '',
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        system_prompt: agent.system_prompt || '',
        enable_voice: agent.enable_voice,
        voice_id: agent.voice_id || 'sB6li6v6ltCgOxFxqdo5',
      });
    }
  }, [agent, form]);

  // Reset model when provider changes
  useEffect(() => {
    const currentModel = form.watch('llm_model');
    const models = LLM_MODELS[selectedProvider];
    if (models && !models.find(m => m.value === currentModel)) {
      form.setValue('llm_model', models[0].value);
    }
  }, [selectedProvider, form]);

  const handleValidateKey = () => {
    const provider = form.watch('llm_provider');
    const apiKey = form.watch('api_key_encrypted');
    if (apiKey) {
      validateKey.mutate({ provider, apiKey });
    }
  };

  const onSubmit = async (data: FormData) => {
    await updateAgent.mutateAsync({ id: agentId!, data });
    navigate(`/ai-agents/${agentId}/memoria`);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Modelo LLM</h1>
          <p className="text-muted-foreground">
            Configure o provedor de IA, modelo e parâmetros de geração
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Provider & Model */}
        <Card>
          <CardHeader>
            <CardTitle>Provedor e Modelo</CardTitle>
            <CardDescription>
              Escolha entre OpenAI ou Google e configure sua API Key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor de IA</Label>
                <Select
                  value={form.watch('llm_provider')}
                  onValueChange={(value: 'openai' | 'google') => form.setValue('llm_provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={form.watch('llm_model')}
                  onValueChange={(value) => form.setValue('llm_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api_key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={selectedProvider === 'openai' ? 'sk-...' : 'AIza...'}
                    {...form.register('api_key_encrypted')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleValidateKey}
                  disabled={validateKey.isPending}
                >
                  {validateKey.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : validateKey.isSuccess ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    'Validar'
                  )}
                </Button>
              </div>
              {form.formState.errors.api_key_encrypted && (
                <p className="text-sm text-destructive">{form.formState.errors.api_key_encrypted.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedProvider === 'openai' 
                  ? 'Obtenha sua API key em platform.openai.com' 
                  : 'Obtenha sua API key em aistudio.google.com'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Generation Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros de Geração</CardTitle>
            <CardDescription>
              Ajuste a criatividade e tamanho das respostas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Temperatura: {form.watch('temperature').toFixed(1)}</Label>
                <span className="text-xs text-muted-foreground">Mais focado ← → Mais criativo</span>
              </div>
              <Slider
                value={[form.watch('temperature')]}
                onValueChange={([value]) => form.setValue('temperature', value)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Máximo de Tokens: {form.watch('max_tokens')}</Label>
                <span className="text-xs text-muted-foreground">~{Math.round(form.watch('max_tokens') * 0.75)} palavras</span>
              </div>
              <Slider
                value={[form.watch('max_tokens')]}
                onValueChange={([value]) => form.setValue('max_tokens', value)}
                min={256}
                max={8192}
                step={256}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Instruções de comportamento para o agente. Define personalidade, regras e contexto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Você é um assistente virtual..."
              rows={12}
              className="font-mono text-sm"
              {...form.register('system_prompt')}
            />
          </CardContent>
        </Card>

        {/* Voice Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voz (Text-to-Speech)
            </CardTitle>
            <CardDescription>
              Habilite respostas em áudio usando ElevenLabs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Habilitar TTS</Label>
                <p className="text-xs text-muted-foreground">Respostas também serão geradas em áudio</p>
              </div>
              <Switch
                checked={form.watch('enable_voice')}
                onCheckedChange={(checked) => form.setValue('enable_voice', checked)}
              />
            </div>

            {form.watch('enable_voice') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Voz</Label>
                  {voicesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : voicesError ? (
                    <p className="text-sm text-destructive">Erro ao carregar vozes. Verifique se a ELEVENLABS_API_KEY está configurada.</p>
                  ) : (
                    <Select
                      value={form.watch('voice_id')}
                      onValueChange={(value) => form.setValue('voice_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a voz" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {voices?.map((voice) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{voice.name}</span>
                              {voice.category && (
                                <span className="text-xs text-muted-foreground">({voice.category})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Voice Preview */}
                {voices && form.watch('voice_id') && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const voice = voices.find(v => v.voice_id === form.watch('voice_id'));
                        if (voice?.preview_url) {
                          if (playingVoiceId === voice.voice_id && audioElement) {
                            audioElement.pause();
                            setPlayingVoiceId(null);
                          } else {
                            if (audioElement) audioElement.pause();
                            const audio = new Audio(voice.preview_url);
                            audio.onended = () => setPlayingVoiceId(null);
                            audio.play();
                            setAudioElement(audio);
                            setPlayingVoiceId(voice.voice_id);
                          }
                        }
                      }}
                    >
                      {playingVoiceId === form.watch('voice_id') ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Ouvir prévia
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {voices.find(v => v.voice_id === form.watch('voice_id'))?.name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/ai-agents/${agentId}/basico`)}>
            Voltar
          </Button>
          <Button 
            type="submit" 
            disabled={updateAgent.isPending}
            className="gap-2"
          >
            Salvar e Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
