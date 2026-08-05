import { useTranslation } from 'react-i18next';
import { Users, MoreHorizontal, ShieldCheck, Pause, Play, Ban, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** AdminUsersPage — gestao de utilizadores. */
export function AdminUsersPage() {
  const { t } = useTranslation();

  const roleBadge = (role: string) => {
    const map: Record<string, 'default' | 'destructive' | 'secondary' | 'warning'> = {
      admin: 'destructive',
      moderator: 'warning',
      user: 'secondary',
    };
    return <Badge variant={map[role] ?? 'default'}>{role}</Badge>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      active: 'success',
      pending: 'secondary',
      suspended: 'warning',
      banned: 'destructive',
    };
    return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-5 w-5 text-destructive" />
          {t('admin.users')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.users')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('admin.user.role')}</TableHead>
                <TableHead>{t('admin.user.status')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem utilizadores.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sample actions row (visualizacao do menu de accoes) */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3 rounded-md bg-secondary/30 p-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">utilizador</p>
                <p className="text-xs text-muted-foreground">user@example.com</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><ShieldCheck className="h-4 w-4" /> {t('admin.user.actions.makeAdmin')}</DropdownMenuItem>
                <DropdownMenuItem><Pause className="h-4 w-4" /> {t('admin.user.actions.suspend')}</DropdownMenuItem>
                <DropdownMenuItem><Play className="h-4 w-4" /> {t('admin.user.actions.activate')}</DropdownMenuItem>
                <DropdownMenuItem><Ban className="h-4 w-4" /> {t('admin.user.actions.ban')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" /> {t('admin.user.actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminUsersPage;
