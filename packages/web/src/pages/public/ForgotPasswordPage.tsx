import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Mail, Send, ArrowLeft, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { forgotPasswordSchema } from '@carsai/shared';
import { api } from '@/lib/api';
import { ENDPOINTS, ROUTES } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

type ForgotForm = { email: string };

/** ForgotPasswordPage — pede link de recuperacao. */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const [sent, setSent] = useState(false);

  const onSubmit = async (data: ForgotForm) => {
    try {
      await api.post(ENDPOINTS.auth.forgotPassword, data, { public: true });
      setSent(true);
      toast.success(t('auth.forgot.success'));
    } catch (e) {
      const err = e as ApiError;
      // Nao revelar se o email existe; mostrar sucesso na mesma
      setSent(true);
      void err;
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
          <CardTitle className="text-2xl">{t('auth.forgot.title')}</CardTitle>
          <CardDescription>{t('auth.forgot.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert variant="success">
              <AlertDescription>{t('auth.forgot.success')}</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" className="pl-9" placeholder="voce@exemplo.com" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? t('common.loading') : t('auth.forgot.submit')}
              </Button>
            </form>
          )}

          <Button asChild variant="ghost" size="sm" className="mt-6 w-full">
            <Link to={ROUTES.LOGIN}>
              <ArrowLeft className="h-4 w-4" />
              {t('auth.forgot.backToLogin')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
