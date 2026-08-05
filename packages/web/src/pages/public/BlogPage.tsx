import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, User, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@carsai/shared';

/** BlogPage — lista de posts (placeholder ate integrar com a API). */
export function BlogPage() {
  const { t } = useTranslation();

  // Placeholder data — sera substituido por dados da API
  const posts = [
    {
      slug: 'bem-vindo-ao-carsai-host',
      title: 'Bem-vindo ao CARSAI HOST',
      excerpt: 'Conheca a plataforma de hospedagem gratuita que usa servidores reais iFastNet.',
      author: 'Equipa CARSAI',
      publishedAt: '2025-01-15T10:00:00Z',
      views: 1234,
      coverImage: undefined as string | undefined,
    },
  ];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('blog.title')}</h1>
      </div>

      {posts.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.slug} className="card-hover overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.publishedAt).toLocaleDateString('pt-PT')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {post.views}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                <Button asChild variant="ghost" size="sm" className="mt-4 -ml-2">
                  <Link to={`${ROUTES.BLOG}/${post.slug}`}>
                    {t('blog.readMore')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogPage;
