import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@carsai/shared';

/** NotFoundPage — 404. */
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <SearchX className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h1 className="text-6xl font-extrabold tracking-tight">404</h1>
        <p className="text-xl font-semibold">{t('errors.404')}</p>
        <p className="text-sm text-muted-foreground">{t('errors.404desc')}</p>
      </div>
      <Button asChild>
        <Link to={ROUTES.HOME}>
          <Home className="h-4 w-4" />
          {t('nav.home')}
        </Link>
      </Button>
    </div>
  );
}

export default NotFoundPage;
