import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActivityLogs } from '@/hooks/useUsers';
import { type UserWithRoles } from '@/types/users';
import { History, Loader2, FileText, Pencil, Trash2, Eye, Download, LogIn } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

interface UserActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithRoles;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  create: FileText,
  update: Pencil,
  delete: Trash2,
  view: Eye,
  export: Download,
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  create: 'Criou',
  update: 'Editou',
  delete: 'Excluiu',
  view: 'Visualizou',
  export: 'Exportou',
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  vehicle: 'Veículo',
  sale: 'Venda',
  customer: 'Cliente',
  user: 'Usuário',
  campaign: 'Campanha',
  negotiation: 'Negociação',
  commission: 'Comissão',
  system: 'Sistema',
};

export function UserActivityDialog({ open, onOpenChange, user }: UserActivityDialogProps) {
  const { data: logs, isLoading } = useActivityLogs({
    userId: user?.id,
    limit: 50,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Atividades
          </DialogTitle>
          <DialogDescription>
            Últimas ações realizadas por {user?.full_name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || FileText;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {ACTION_LABELS[log.action] || log.action}{' '}
                        <span className="text-muted-foreground">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </span>
                      </p>
                      {log.details && (
                        <p className="text-sm text-muted-foreground truncate">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const date = parseDate(log.created_at);
                          return date ? format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : '-';
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma atividade registrada</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
