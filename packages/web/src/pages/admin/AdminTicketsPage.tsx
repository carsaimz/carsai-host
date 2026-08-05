import { useTranslation } from 'react-i18next';
import { LifeBuoy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** AdminTicketsPage — todos os tickets. */
export function AdminTicketsPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LifeBuoy className="h-5 w-5 text-destructive" />
          {t('admin.tickets')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.tickets')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tickets.subject')}</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>{t('tickets.priority')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('tickets.createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Sem tickets.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminTicketsPage;
