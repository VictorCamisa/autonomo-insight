import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';

interface UseFormPersistenceOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  key: string;
  exclude?: Path<T>[];
  debounceMs?: number;
}

/**
 * Hook para persistir dados de formulário no localStorage
 * Salva automaticamente conforme o usuário digita e restaura ao retornar
 */
export function useFormPersistence<T extends FieldValues>({
  form,
  key,
  exclude = [],
  debounceMs = 500,
}: UseFormPersistenceOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Restaurar dados salvos ao montar o componente
  useEffect(() => {
    if (initializedRef.current) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const { data, timestamp } = parsed;
        
        // Verificar se o rascunho não é muito antigo (24 horas)
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < maxAge && data) {
          // Restaurar valores salvos
          Object.keys(data).forEach((fieldName) => {
            if (!exclude.includes(fieldName as Path<T>)) {
              const value = data[fieldName];
              if (value !== undefined && value !== null && value !== '') {
                form.setValue(fieldName as Path<T>, value, { shouldDirty: true });
              }
            }
          });
          console.log(`[FormPersistence] Rascunho restaurado para: ${key}`);
        }
      }
    } catch (error) {
      console.error('[FormPersistence] Erro ao restaurar rascunho:', error);
    }
    
    initializedRef.current = true;
  }, [form, storageKey, exclude, key]);

  // Observar mudanças e salvar com debounce
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          // Filtrar campos excluídos
          const dataToSave = { ...values };
          exclude.forEach((field) => {
            delete dataToSave[field as string];
          });

          const payload = {
            data: dataToSave,
            timestamp: Date.now(),
          };

          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
          console.error('[FormPersistence] Erro ao salvar rascunho:', error);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, storageKey, exclude, debounceMs]);

  // Função para limpar o rascunho (chamar após submit com sucesso)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log(`[FormPersistence] Rascunho removido: ${key}`);
    } catch (error) {
      console.error('[FormPersistence] Erro ao limpar rascunho:', error);
    }
  }, [storageKey, key]);

  // Função para verificar se existe rascunho
  const hasDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return false;
      
      const { timestamp } = JSON.parse(saved);
      const maxAge = 24 * 60 * 60 * 1000;
      return Date.now() - timestamp < maxAge;
    } catch {
      return false;
    }
  }, [storageKey]);

  // Função para descartar rascunho manualmente
  const discardDraft = useCallback(() => {
    clearDraft();
    form.reset();
  }, [clearDraft, form]);

  return {
    clearDraft,
    hasDraft,
    discardDraft,
  };
}

/**
 * Hook para alertar o usuário antes de sair da página com formulário não salvo
 */
export function useFormLeaveWarning(isDirty: boolean, message?: string) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const msg = message || 'Você tem alterações não salvas. Deseja sair mesmo assim?';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}
