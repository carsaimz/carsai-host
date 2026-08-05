import { useTranslation } from 'react-i18next';
import { Clock, Plus, Play, Pause } from 'lucide-react';
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

/** CronPage — tarefas agendadas. */
export function CronPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Clock className="h-5 w-5 text-primary" />
            {t('cron.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('cron.scheduleExamples')}</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('cron.create')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cron.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cron.name')}</TableHead>
                <TableHead>{t('cron.schedule')}</TableHead>
                <TableHead>{t('cron.lastRun')}</TableHead>
                <TableHead>{t('cron.nextRun')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma tarefa agendada.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default CronPage;
