import { useTranslation } from 'react-i18next';
import { Database, Plus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** DatabasesPage — lista de BDs + form de criacao (placeholder). */
export function DatabasesPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Database className="h-5 w-5 text-primary" />
            {t('databases.title')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
            {t('databases.openPhpmyadmin')}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {t('databases.create')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('databases.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('databases.name')}</TableHead>
                <TableHead>{t('databases.user')}</TableHead>
                <TableHead>{t('common.size')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t('databases.empty')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default DatabasesPage;
