import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Zap,
  Shield,
  Database,
  Globe,
  LifeBuoy,
  Rocket,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@carsai/shared';

/** HomePage — hero + features grid + CTA. SEM stats de servidor. */
export function HomePage() {
  const { t } = useTranslation();

  const features = [
    { icon: Server, title: 'Hospedagem real', desc: 'Servidores iFastNet (Byet) — nao uma demonstracao.' },
    { icon: Zap, title: 'SSD NVMe', desc: 'Discos rapidos para carregamento instantaneo.' },
    { icon: Shield, title: 'SSL gratuito', desc: 'Certificados Let\'s Encrypt com renovacao automatica.' },
    { icon: Database, title: 'MySQL + phpMyAdmin', desc: 'Bases de dados ilimitadas com gestao web.' },
    { icon: Globe, title: 'Dominios ilimitados', desc: 'Adicione sub-dominios ou o seu proprio dominio.' },
    { icon: LifeBuoy, title: 'Suporte 24/7', desc: 'Equipa dedicada via tickets e forum.' },
  ];

  const ctaItems = [
    'Sem cartao de credito',
    'Sem periodo de teste',
    'Sem anuncios forçados',
    '100% gratuito para sempre',
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.15), transparent 40%), radial-gradient(circle at 80% 30%, hsl(var(--accent) / 0.12), transparent 40%)',
          }}
        />
        <div className="container relative flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            {t('common.tagline')}
          </span>
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
            {t('home.hero.title')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl">
              <Link to={ROUTES.REGISTER}>
                {t('home.hero.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to={ROUTES.FEATURES}>{t('home.hero.ctaSecondary')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t('home.features.title')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('home.features.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="card-hover">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card/40">
        <div className="container flex flex-col items-center gap-8 py-16 text-center md:py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            {t('home.cta.title')}
          </h2>
          <p className="max-w-xl text-muted-foreground">{t('home.cta.subtitle')}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {ctaItems.map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{c}</span>
              </div>
            ))}
          </div>
          <Button asChild size="xl">
            <Link to={ROUTES.REGISTER}>
              {t('home.cta.button')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
