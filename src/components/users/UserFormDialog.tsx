import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateUser, useUpdateUser, useUpdateUserPermissions } from '@/hooks/useUsers';
import {
  MODULE_LABELS,
  PERMISSION_LABELS,
  type UserWithRoles,
  type ModuleName,
  type PermissionType,
} from '@/types/users';
import { Loader2 } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  user?: UserWithRoles;
}

const MODULES: ModuleName[] = [
  'crm',
  'vendas',
  'estoque',
  'financeiro',
  'marketing',
  'comissoes',
  'configuracoes',
  'usuarios',
];

const PERMISSIONS: PermissionType[] = ['view', 'create', 'edit', 'delete', 'manage'];

export function UserFormDialog({ open, onOpenChange, mode, user }: UserFormDialogProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updatePermissions = useUpdateUserPermissions();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<
    { module: ModuleName; permission: PermissionType }[]
  >([]);

  useEffect(() => {
    if (mode === 'edit' && user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPassword('');
      setPhone((user as any).phone || '');
      setSelectedPermissions(
        user.permissions.map((p) => ({
          module: p.module as ModuleName,
          permission: p.permission as PermissionType,
        }))
      );
    } else if (mode === 'create') {
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedPermissions([
        { module: 'crm', permission: 'view' },
        { module: 'vendas', permission: 'view' },
        { module: 'estoque', permission: 'view' },
      ]);
    }
  }, [mode, user, open]);

  const hasPermission = (module: ModuleName, permission: PermissionType) => {
    return selectedPermissions.some(
      (p) => p.module === module && p.permission === permission
    );
  };

  const togglePermission = (module: ModuleName, permission: PermissionType) => {
    if (hasPermission(module, permission)) {
      setSelectedPermissions(
        selectedPermissions.filter(
          (p) => !(p.module === module && p.permission === permission)
        )
      );
    } else {
      setSelectedPermissions([...selectedPermissions, { module, permission }]);
    }
  };

  const toggleAllForModule = (module: ModuleName) => {
    const modulePerms = selectedPermissions.filter((p) => p.module === module);
    if (modulePerms.length === PERMISSIONS.length) {
      setSelectedPermissions(selectedPermissions.filter((p) => p.module !== module));
    } else {
      const otherPerms = selectedPermissions.filter((p) => p.module !== module);
      const allModulePerms = PERMISSIONS.map((permission) => ({ module, permission }));
      setSelectedPermissions([...otherPerms, ...allModulePerms]);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'create') {
      await createUser.mutateAsync({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        roles: ['vendedor'],
        permissions: selectedPermissions,
      });
    } else if (user) {
      await updateUser.mutateAsync({
        userId: user.id,
        full_name: fullName,
        phone: phone || undefined,
      });

      await updatePermissions.mutateAsync({
        userId: user.id,
        permissions: selectedPermissions,
      });
    }

    onOpenChange(false);
  };

  const isSubmitting = createUser.isPending || updateUser.isPending || updatePermissions.isPending;
  const isValid =
    mode === 'create'
      ? fullName && email && password.length >= 6 && selectedPermissions.length > 0
      : fullName && selectedPermissions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Crie um novo usuário e defina seus acessos'
              : 'Edite as informações e acessos do usuário'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>

            {mode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha * (mín. 6 caracteres)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                  />
                </div>
              </>
            )}

            {mode === 'edit' && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (para notificações)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">
                Receberá notificações de leads qualificados
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões por Módulo</Label>
            <ScrollArea className="h-[300px] border rounded-md p-3">
              <div className="space-y-4">
                {MODULES.map((module) => {
                  const modulePermCount = selectedPermissions.filter(
                    (p) => p.module === module
                  ).length;
                  const isAllSelected = modulePermCount === PERMISSIONS.length;

                  return (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {MODULE_LABELS[module]}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => toggleAllForModule(module)}
                        >
                          {isAllSelected ? 'Remover todos' : 'Selecionar todos'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PERMISSIONS.map((permission) => (
                          <div
                            key={`${module}-${permission}`}
                            className="flex items-center gap-1.5"
                          >
                            <Checkbox
                              id={`${module}-${permission}`}
                              checked={hasPermission(module, permission)}
                              onCheckedChange={() =>
                                togglePermission(module, permission)
                              }
                            />
                            <Label
                              htmlFor={`${module}-${permission}`}
                              className="text-xs font-normal cursor-pointer"
                            >
                              {PERMISSION_LABELS[permission]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
