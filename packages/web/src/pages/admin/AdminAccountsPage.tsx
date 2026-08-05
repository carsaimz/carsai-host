import { useTranslation } from 'react-i18next';
import { Server, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** AdminAccountsPage — todas as contas de hospedagem (admin). */
export function AdminAccountsPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Server className="h-5 w-5 text-destructive" />
          {t('admin.accounts')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.accounts')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.domain')}</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem contas.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminAccountsPage;
