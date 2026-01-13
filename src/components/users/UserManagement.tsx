import { useState } from 'react';
import { useUsersWithRoles, useUpdateUser, useSyncUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  History,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { UserFormDialog } from './UserFormDialog';
import { UserActivityDialog } from './UserActivityDialog';
import { UserWhatsAppButton } from './UserWhatsAppButton';
import { type UserWithRoles } from '@/types/users';
import { useAuth } from '@/contexts/AuthContext';

export function UserManagement() {
  const { data: users, isLoading } = useUsersWithRoles();
  const { user: currentUser } = useAuth();
  const updateUser = useUpdateUser();
  const syncUsers = useSyncUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [activityUser, setActivityUser] = useState<UserWithRoles | null>(null);

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleActive = async (user: UserWithRoles) => {
    await updateUser.mutateAsync({
      userId: user.id,
      is_active: !user.is_active,
    });
  };

  // ID do Matheus - único administrador
  const ADMIN_USER_ID = '6c6e6c96-41d1-4ccc-a8d7-bbe1d1e62336';

  const isUserAdmin = (userId: string) => userId === ADMIN_USER_ID;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Adicione, edite e gerencie os acessos dos usuários do sistema
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => syncUsers.mutateAsync()}
              disabled={syncUsers.isPending}
            >
              {syncUsers.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum usuário encontrado. Se você já tem usuários no Supabase Auth, clique em <span className="font-medium">Sincronizar</span>.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const userIsAdmin = isUserAdmin(user.id);

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {userIsAdmin ? (
                          <Badge variant="default" className="bg-primary">
                            Administrador
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Usuário
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <UserWhatsAppButton user={user} />
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActivityUser(user)}>
                              <History className="h-4 w-4 mr-2" />
                              Ver Histórico
                            </DropdownMenuItem>

                            {!isCurrentUser && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(user)}
                                  className={user.is_active ? 'text-destructive' : 'text-green-600'}
                                >
                                  {user.is_active ? (
                                    <>
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <UserFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />

      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        mode="edit"
        user={editingUser || undefined}
      />

      <UserActivityDialog
        open={!!activityUser}
        onOpenChange={(open) => !open && setActivityUser(null)}
        user={activityUser}
      />
    </Card>
  );
}
