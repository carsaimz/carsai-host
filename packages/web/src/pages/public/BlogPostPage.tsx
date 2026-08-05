import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, User, Eye, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@carsai/shared';

/** BlogPostPage — artigo unico. */
export function BlogPostPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="page-container max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.BLOG}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-3xl font-bold tracking-tight">{slug ?? 'Post'}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {t('blog.by', { author: 'Equipa CARSAI' })}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date().toLocaleDateString('pt-PT')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> 0
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-invert max-w-none text-sm text-muted-foreground">
            <p>Conteudo do artigo sera carregado da API.</p>
          </div>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
            {t('blog.sharePost')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default BlogPostPage;
