import { useState } from 'react';
import { MessageCircle, Plus, Wifi, WifiOff, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppInstances } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WhatsAppInstanceSelectorProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstanceConnected: () => void;
}

export function WhatsAppInstanceSelector({
  userId,
  open,
  onOpenChange,
  onInstanceConnected,
}: WhatsAppInstanceSelectorProps) {
  const { data: instances, isLoading } = useWhatsAppInstances();
  const [selectedOption, setSelectedOption] = useState<string>('new');
  const [isConnecting, setIsConnecting] = useState(false);

  // Filter to only show shared or available instances
  const availableInstances = instances?.filter(
    (i) => i.is_shared || i.status === 'connected'
  ) || [];

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (selectedOption === 'new') {
        // Create new instance for user
        const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
          body: { action: 'createForUser', userId },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast.success('Instância criada! Escaneie o QR Code para conectar.');
      } else {
        // Link user to existing instance using the junction table
        // First, remove any existing link for this user
        await supabase
          .from('user_whatsapp_instances')
          .delete()
          .eq('user_id', userId);

        // Then create the new link
        const { error } = await supabase
          .from('user_whatsapp_instances')
          .insert({
            user_id: userId,
            instance_id: selectedOption,
          });

        if (error) throw error;

        toast.success('Usuário conectado à instância!');
      }

      onInstanceConnected();
      onOpenChange(false);
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error(`Erro ao conectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Ativar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escolha uma instância existente ou crie uma nova para este usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              {/* Create new option */}
              <div 
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  selectedOption === 'new' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                )}
                onClick={() => setSelectedOption('new')}
              >
                <RadioGroupItem value="new" id="new-instance" />
                <div className="flex-1">
                  <Label htmlFor="new-instance" className="cursor-pointer flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Criar Nova Instância</p>
                      <p className="text-sm text-muted-foreground">
                        Uma nova instância será criada exclusiva para este usuário
                      </p>
                    </div>
                  </Label>
                </div>
              </div>

              {/* Divider if there are available instances */}
              {availableInstances.length > 0 && (
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou conectar a uma existente
                    </span>
                  </div>
                </div>
              )}

              {/* Existing instances */}
              {availableInstances.map((instance) => (
                <div 
                  key={instance.id}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    selectedOption === instance.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                  onClick={() => setSelectedOption(instance.id)}
                >
                  <RadioGroupItem value={instance.id} id={instance.id} />
                  <div className="flex-1">
                    <Label htmlFor={instance.id} className="cursor-pointer flex items-center gap-2">
                      <div 
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center",
                          instance.status === 'connected' 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-muted"
                        )}
                      >
                        {instance.status === 'connected' ? (
                          <Wifi className="h-5 w-5 text-green-600" />
                        ) : instance.status === 'qr_code' ? (
                          <QrCode className="h-5 w-5 text-blue-600" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{instance.name}</p>
                          {instance.is_shared && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Compartilhada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {instance.phone_number || instance.instance_name}
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : selectedOption === 'new' ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Instância
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Conectar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
