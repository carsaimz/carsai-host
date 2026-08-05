import { useTranslation } from 'react-i18next';
import { Code2, Plus, Copy, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

/** ApiTokensPage — tokens de API do utilizador. */
export function ApiTokensPage() {
  const { t } = useTranslation();

  const handleCopy = async () => {
    const ok = await copyToClipboard('placeholder-token');
    if (ok) toast.success(t('success.copied'));
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Code2 className="h-5 w-5 text-primary" />
            {t('profile.apiTokens')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('profile.copyToken')}</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t('profile.createToken')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('profile.createToken')}</DialogTitle>
              <DialogDescription>{t('profile.tokenName')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tokenName">{t('profile.tokenName')}</Label>
                <Input id="tokenName" placeholder="ex: CI deploy" />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.scopes')}</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">accounts:read</Badge>
                  <Badge variant="outline">accounts:write</Badge>
                  <Badge variant="outline">tickets:read</Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{t('common.create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('profile.apiTokens')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('profile.tokenName')}</TableHead>
                <TableHead>{t('profile.scopes')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum token criado.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiTokensPage;
