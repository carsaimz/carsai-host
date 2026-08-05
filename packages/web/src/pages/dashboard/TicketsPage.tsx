import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Plus } from 'lucide-react';
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
import { ROUTES } from '@carsai/shared';

/** TicketsPage — lista de tickets. */
export function TicketsPage() {
  const { t } = useTranslation();

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
      open: 'warning',
      pending: 'secondary',
      resolved: 'success',
      closed: 'default',
    };
    return <Badge variant={map[status] ?? 'default'}>{t(`tickets.status.${status}` as const)}</Badge>;
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LifeBuoy className="h-5 w-5 text-primary" />
            {t('tickets.title')}
          </h1>
        </div>
        <Button asChild size="sm">
          <Link to={ROUTES.DASHBOARD_TICKETS + '/create'}>
            <Plus className="h-4 w-4" />
            {t('tickets.new')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('tickets.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tickets.subject')}</TableHead>
                <TableHead>{t('tickets.priority')}</TableHead>
                <TableHead>{t('tickets.department')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('tickets.createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {t('tickets.empty')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default TicketsPage;
