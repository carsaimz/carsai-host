import { useTranslation } from 'react-i18next';
import { Server, Heart, Globe, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** AboutPage — sobre a plataforma. */
export function AboutPage() {
  const { t } = useTranslation();

  const points = [
    { icon: Server, title: 'Infraestrutura real', desc: 'Servidores iFastNet (Byet) com mais de 10 anos de mercado.' },
    { icon: Heart, title: 'Gratuito para sempre', desc: 'Sem planos pagos. Sem periodos de teste. Sem cartao.' },
    { icon: Globe, title: 'Comunidade global', desc: 'Suporte em PT, EN, FR e ES.' },
    { icon: Shield, title: 'Segurança primeiro', desc: 'SSL gratuito, 2FA, monitoramento 24/7.' },
  ];

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('nav.about')}</h1>
        <p className="mt-3 text-muted-foreground">
          O CARSAI HOST e uma plataforma de hospedagem web 100% gratuita, construida sobre a
          infraestrutura iFastNet (Byet) via MOFH.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{p.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AboutPage;
