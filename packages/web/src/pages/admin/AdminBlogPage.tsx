import { useTranslation } from 'react-i18next';
import { FileText, Plus, Pencil, Trash2, Eye } from 'lucide-react';
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

/** AdminBlogPage — gestao de posts do blog. */
export function AdminBlogPage() {
  const { t } = useTranslation();

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'secondary' | 'warning'> = {
      published: 'success',
      draft: 'secondary',
      archived: 'warning',
    };
    return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-5 w-5 text-destructive" />
            {t('admin.blog')}
          </h1>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.blog')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem posts.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminBlogPage;
