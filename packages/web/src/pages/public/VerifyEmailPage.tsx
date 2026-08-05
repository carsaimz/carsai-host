import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailCheck, RefreshCw, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ENDPOINTS, ROUTES } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

/** VerifyEmailPage — confirma verificacao de email. */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token');
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api.post(ENDPOINTS.auth.verifyEmail, { token }, { public: true });
        if (!cancelled) setVerified(true);
      } catch {
        /* ignore — deixa o utilizador reenviar */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post(ENDPOINTS.auth.resendVerification, { email }, { public: true });
      toast.success(t('auth.verifyEmail.resent'));
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message ?? t('errors.serverError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <Link to={ROUTES.HOME} className="mx-auto flex items-center gap-2 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
              <Server className="h-5 w-5" />
            </span>
            <span className="text-xl">CARSAI HOST</span>
          </Link>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t('auth.verifyEmail.title')}</CardTitle>
          <CardDescription>{t('auth.verifyEmail.subtitle', { email })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified && (
            <Alert variant="success">
              <AlertDescription>{t('auth.verifyEmail.verified')}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleResend} variant="outline" className="w-full" disabled={resending || !email}>
            <RefreshCw className={resending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {resending ? t('common.loading') : t('auth.verifyEmail.resend')}
          </Button>
          <Button asChild className="w-full">
            <Link to={ROUTES.LOGIN}>{t('nav.login')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default VerifyEmailPage;
