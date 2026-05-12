import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tag, Save, Trash2, AlertCircle } from 'lucide-react';
import { useSiteSetting, useUpsertSiteSetting, useDeleteSiteSetting } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';

const GTM_REGEX = /^GTM-[A-Z0-9]+$/;

export function GoogleTagManagerSettings() {
  const { data: current, isLoading } = useSiteSetting('gtm_id');
  const upsert = useUpsertSiteSetting();
  const remove = useDeleteSiteSetting();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(current ?? '');
  }, [current]);

  const trimmed = value.trim().toUpperCase();
  const isValid = trimmed === '' || GTM_REGEX.test(trimmed);
  const dirty = trimmed !== (current ?? '').trim().toUpperCase();

  const handleSave = async () => {
    if (!isValid) {
      toast.error('ID inválido. Use o formato GTM-XXXXXXX');
      return;
    }
    try {
      await upsert.mutateAsync({ key: 'gtm_id', value: trimmed || null });
      toast.success('Google Tag Manager atualizado. Recarregue a página para aplicar.');
    } catch (e) {
      toast.error('Erro ao salvar', { description: (e as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remover o Google Tag Manager do site?')) return;
    try {
      await remove.mutateAsync('gtm_id');
      setValue('');
      toast.success('Removido. Recarregue a página para aplicar.');
    } catch (e) {
      toast.error('Erro ao remover', { description: (e as Error).message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Google Tag Manager
          {current && <Badge variant="secondary" className="ml-2">Ativo</Badge>}
        </CardTitle>
        <CardDescription>
          Cole o ID do contêiner GTM (ex.: GTM-MGH7N9MX). O script é carregado
          dinamicamente em todo o site. Deixe em branco e salve para desativar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gtm-id">ID do contêiner</Label>
          <Input
            id="gtm-id"
            placeholder="GTM-XXXXXXX"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
            className="font-mono"
          />
          {!isValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Formato inválido. Use GTM-XXXXXXX.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!dirty || !isValid || upsert.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {current ? 'Atualizar' : 'Adicionar'}
          </Button>
          {current && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={remove.isPending}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-3">
          Após salvar, recarregue a página para que as mudanças entrem em vigor.
        </p>
      </CardContent>
    </Card>
  );
}
