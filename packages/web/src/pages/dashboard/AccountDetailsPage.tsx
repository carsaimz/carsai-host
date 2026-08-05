import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Server,
  Database,
  Lock,
  Copy,
  Pause,
  Play,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ROUTES } from '@carsai/shared';
import { copyToClipboard } from '@/lib/utils';

/** AccountDetailsPage — credenciais, cPanel, FTP, MySQL, accoes. */
export function AccountDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const credentials: { label: string; value: string }[] = [
    { label: t('accounts.details.cpanel'), value: `https://cpanel.example.com:2083` },
    { label: 'Username', value: 'epiz_0000000' },
    { label: t('common.password'), value: '••••••••' },
    { label: t('accounts.details.ftp'), value: 'ftp.example.com' },
    { label: t('accounts.details.mysql'), value: 'sql.example.com' },
    { label: t('accounts.details.serverIp'), value: '185.27.134.0' },
    { label: t('accounts.details.nameservers'), value: 'ns1.epizy.com, ns2.epizy.com' },
  ];

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) toast.success(t('success.copied'));
  };

  return (
    <div className="page-container">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.DASHBOARD_ACCOUNTS}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe className="h-5 w-5 text-primary" />
            {id ?? 'Conta'}
          </h1>
          <p className="text-sm text-muted-foreground">Conta #{id}</p>
        </div>
        <Badge variant="success">{t('accounts.status.active')}</Badge>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('common.actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="https://cpanel.example.com:2083" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t('accounts.actions.openCpanel')}
              </a>
            </Button>
            <Button variant="outline" size="sm">
              <Pause className="h-4 w-4" />
              {t('accounts.actions.suspend')}
            </Button>
            <Button variant="outline" size="sm">
              <KeyRound className="h-4 w-4" />
              {t('accounts.actions.resetPassword')}
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
              {t('accounts.actions.delete')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-4 w-4 text-primary" />
              {t('accounts.details.credentials')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {credentials.map((c, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
                    <p className="truncate font-mono text-sm">{c.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(c.value)}
                    aria-label={t('accounts.details.copyToClipboard')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acesso rapido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={ROUTES.DASHBOARD_FILES}>
                <Server className="h-4 w-4" /> {t('files.title')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={ROUTES.DASHBOARD_DATABASES}>
                <Database className="h-4 w-4" /> {t('databases.title')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={ROUTES.DASHBOARD_DOMAINS}>
                <Globe className="h-4 w-4" /> {t('domains.title')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={ROUTES.DASHBOARD_SSL}>
                <Lock className="h-4 w-4" /> {t('ssl.title')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AccountDetailsPage;
