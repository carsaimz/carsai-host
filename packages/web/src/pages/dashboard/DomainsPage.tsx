import { useTranslation } from 'react-i18next';
import { Globe, Plus, Lock, ShieldCheck } from 'lucide-react';
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

/** DomainsPage — dominios, DNS, SSL. */
export function DomainsPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe className="h-5 w-5 text-primary" />
            {t('domains.title')}
          </h1>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('domains.add')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('domains.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.domain')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('domains.ssl')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum dominio adicionado.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DNS records placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('domains.dnsRecords')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[100px] items-center justify-center text-sm text-muted-foreground">
            Selecione um dominio para ver os registos DNS.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DomainsPage;
