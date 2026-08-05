import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Server,
  LifeBuoy,
  HardDrive,
  Gauge,
  Plus,
  MessageSquarePlus,
  Upload,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@carsai/shared';

/** OverviewPage — stats cards + accoes rapidas + actividade recente. */
export function OverviewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const stats = [
    { icon: Server, label: t('dashboard.stats.accounts'), value: '0', color: 'text-primary' },
    { icon: LifeBuoy, label: t('dashboard.stats.tickets'), value: '0', color: 'text-warning' },
    { icon: HardDrive, label: t('dashboard.stats.storage'), value: '0 MB', color: 'text-success' },
    { icon: Gauge, label: t('dashboard.stats.bandwidth'), value: '0 MB', color: 'text-accent' },
  ];

  const quickActions = [
    { icon: Plus, label: t('dashboard.createAccount'), to: ROUTES.DASHBOARD_ACCOUNTS + '/create' },
    { icon: MessageSquarePlus, label: t('dashboard.openTicket'), to: ROUTES.DASHBOARD_TICKETS + '/create' },
    { icon: Upload, label: t('dashboard.uploadFile'), to: ROUTES.DASHBOARD_FILES },
  ];

  return (
    <div className="page-container">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboard.welcome', { name: user?.firstName || user?.username || '' })}
        </h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.title')}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-secondary ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((a) => (
              <Button
                key={a.label}
                asChild
                variant="outline"
                className="h-auto flex-col items-start gap-2 py-4"
              >
                <Link to={a.to}>
                  <a.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{a.label}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Abrir <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-4 w-4 text-primary" />
            {t('dashboard.recentActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
            Sem actividade recente.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewPage;
