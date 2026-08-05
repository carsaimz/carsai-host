import { useTranslation } from 'react-i18next';
import { HardDriveDownload, Plus, Download, RotateCcw } from 'lucide-react';
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

/** BackupsPage — lista de backups + criar. */
export function BackupsPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HardDriveDownload className="h-5 w-5 text-primary" />
            {t('backups.title')}
          </h1>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('backups.create')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('backups.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('backups.provider')}</TableHead>
                <TableHead>{t('common.size')}</TableHead>
                <TableHead>{t('backups.lastBackup')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t('backups.empty')}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default BackupsPage;
