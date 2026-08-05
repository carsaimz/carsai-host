import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, User, Lock, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@carsai/shared';

/** SettingsPage — hub de definicoes (perfil, seguranca, API). */
export function SettingsPage() {
  const { t } = useTranslation();

  const sections = [
    {
      icon: User,
      title: t('profile.personalInfo'),
      desc: 'Actualize o seu nome, email e idioma.',
      to: ROUTES.DASHBOARD_PROFILE,
    },
    {
      icon: Lock,
      title: t('profile.security'),
      desc: 'Altere a password, active 2FA.',
      to: ROUTES.DASHBOARD_PROFILE,
    },
    {
      icon: Code2,
      title: t('profile.apiTokens'),
      desc: 'Crie tokens para a API publica.',
      to: ROUTES.DASHBOARD_API,
    },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          {t('nav.settings')}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.title} className="card-hover">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={s.to}>{t('common.edit')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SettingsPage;
