import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessagesSquare, ArrowRight, Pin, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@carsai/shared';

/** ForumPage — lista de categorias. */
export function ForumPage() {
  const { t } = useTranslation();

  const categories = [
    {
      id: '1',
      name: 'Anuncios',
      slug: 'anuncios',
      description: 'Novidades e actualizacoes da plataforma.',
      topicsCount: 5,
    },
    {
      id: '2',
      name: 'Suporte Tecnico',
      slug: 'suporte-tecnico',
      description: 'Tire as suas duvidas tecnicas com a comunidade.',
      topicsCount: 42,
    },
    {
      id: '3',
      name: 'Tutoriais',
      slug: 'tutoriais',
      description: 'Guias e dicas partilhados pelos utilizadores.',
      topicsCount: 18,
    },
  ];

  return (
    <div className="page-container">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('forum.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('forum.categories')}</p>
        </div>
        <Button size="sm">
          <MessagesSquare className="h-4 w-4" />
          {t('forum.newTopic')}
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((c) => (
          <Card key={c.id} className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link to={`${ROUTES.FORUM}/${c.slug}`} className="hover:text-primary">
                  {c.name}
                </Link>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {c.topicsCount} {t('forum.topics')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{c.description}</p>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`${ROUTES.FORUM}/${c.slug}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder para topicos */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Pin className="h-4 w-4 text-primary" /> Topico fixado de exemplo
            </span>
            <span className="text-xs text-muted-foreground">0 {t('forum.replies')}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" /> Topico bloqueado
            </span>
            <span className="text-xs text-muted-foreground">0 {t('forum.replies')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForumPage;
