import { useTranslation } from 'react-i18next';
import {
  Users,
  Server,
  LifeBuoy,
  FileText,
  MessagesSquare,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** AdminDashboardPage — estatisticas do sistema (apenas admin). */
export function AdminDashboardPage() {
  const { t } = useTranslation();

  const stats = [
    { icon: Users, label: t('admin.stats.totalUsers'), value: '0', color: 'text-primary' },
    { icon: Server, label: t('admin.stats.totalAccounts'), value: '0', color: 'text-accent' },
    { icon: Server, label: t('admin.stats.activeAccounts'), value: '0', color: 'text-success' },
    { icon: Server, label: t('admin.stats.suspendedAccounts'), value: '0', color: 'text-warning' },
    { icon: LifeBuoy, label: t('admin.stats.openTickets'), value: '0', color: 'text-destructive' },
    { icon: FileText, label: t('admin.stats.totalPosts'), value: '0', color: 'text-primary' },
    { icon: MessagesSquare, label: t('admin.stats.totalTopics'), value: '0', color: 'text-accent' },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Activity className="h-5 w-5 text-destructive" />
          {t('admin.title')}
        </h1>
        <p className="text-sm text-muted-foreground">Estatisticas em tempo real do sistema.</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-4 w-4 text-primary" />
            Actividade recente do sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[150px] items-center justify-center text-sm text-muted-foreground">
            Grafico de actividade sera implementado numa proxima iteracao (Chart.js).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboardPage;
