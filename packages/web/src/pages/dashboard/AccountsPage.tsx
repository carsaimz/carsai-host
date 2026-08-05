import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Server, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROUTES } from '@carsai/shared';

/** AccountsPage — tabela de contas de hospedagem. */
export function AccountsPage() {
  const { t } = useTranslation();
  const accounts: never[] = []; // sera preenchido pela API

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
      active: 'success',
      suspended: 'warning',
      terminated: 'destructive',
      creating: 'secondary',
      failed: 'destructive',
    };
    return <Badge variant={map[status] ?? 'default'}>{status}</Badge>;
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('accounts.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounts.title')}</p>
        </div>
        <Button asChild>
          <Link to={ROUTES.DASHBOARD_ACCOUNTS + '/create'}>
            <Plus className="h-4 w-4" />
            {t('accounts.create')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-4 w-4 text-primary" />
            {t('accounts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('accounts.empty')}</p>
                <Button asChild size="sm" className="mt-3">
                  <Link to={ROUTES.DASHBOARD_ACCOUNTS + '/create'}>
                    <Plus className="h-4 w-4" />
                    {t('accounts.createFirst')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.domain')}</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Placeholder skeleton — sera substituido por dados reais */}
                {Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell>{statusBadge('creating')}</TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AccountsPage;
