import { useTranslation } from 'react-i18next';
import { MessagesSquare, Pin, Lock, Trash2 } from 'lucide-react';
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

/** AdminForumPage — moderacao do forum. */
export function AdminForumPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessagesSquare className="h-5 w-5 text-destructive" />
          {t('admin.forum')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.forum')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topico</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem topicos.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminForumPage;
