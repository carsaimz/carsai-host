import { useTranslation } from 'react-i18next';
import { Lock, Plus, ShieldCheck } from 'lucide-react';
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

/** SslPage — certificados SSL. */
export function SslPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Lock className="h-5 w-5 text-primary" />
            {t('ssl.title')}
          </h1>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('ssl.issue')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('ssl.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.domain')}</TableHead>
                <TableHead>{t('ssl.provider')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum certificado SSL emitido.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default SslPage;
