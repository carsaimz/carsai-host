import { useTranslation } from 'react-i18next';
import { Zap, Server, Database, Globe, Shield, Code2, LifeBuoy, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** FeaturesPage — lista detalhada de funcionalidades. */
export function FeaturesPage() {
  const { t } = useTranslation();

  const features = [
    { icon: Server, title: 'Hospedagem real iFastNet', desc: 'Conta activa em segundos. Servidores empresariais Byet, nao um demo.' },
    { icon: Zap, title: 'SSD NVMe + LiteSpeed', desc: 'Performance de nivel empresarial com cache HTTP/3.' },
    { icon: Database, title: 'MySQL + phpMyAdmin', desc: 'Bases de dados ilimitadas, acesso web e remoto.' },
    { icon: Globe, title: 'Dominios ilimitados', desc: 'Sub-dominios gratis ou ligue o seu proprio dominio.' },
    { icon: Shield, title: 'SSL gratuito', desc: 'Let\'s Encrypt, ZeroSSL ou GoGetSSL com renovacao automatica.' },
    { icon: Code2, title: 'PHP 8 + Node.js', desc: 'Multiplas versoes PHP, Python, Node e cron jobs.' },
    { icon: HardDrive, title: 'Backups', desc: 'Backups locais, Google Drive ou Dropbox.' },
    { icon: LifeBuoy, title: 'Suporte 24/7', desc: 'Tickets, forum comunitario e base de conhecimento.' },
  ];

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('home.features.title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('home.features.subtitle')}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}

export default FeaturesPage;
