import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pin, Lock, Reply, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@carsai/shared';

/** ForumTopicPage — topico + respostas. */
export function ForumTopicPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="page-container max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.FORUM}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{slug ?? 'Topico'}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t('forum.by')} utilizador</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('pt-PT')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Conteudo do topico sera carregado da API.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t('forum.replies')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reply card */}
          <div className="flex gap-3 rounded-md border border-border p-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">utilizador</span>
                <span className="text-muted-foreground">{new Date().toLocaleDateString('pt-PT')}</span>
              </div>
              <p className="text-sm text-muted-foreground">Resposta de exemplo.</p>
            </div>
          </div>

          {/* Reply form */}
          <div className="space-y-2">
            <Textarea placeholder={t('forum.body')} rows={4} />
            <Button size="sm">
              <Reply className="h-4 w-4" />
              {t('forum.reply')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForumTopicPage;
