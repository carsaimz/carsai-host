import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { KeyRound, Save, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@carsai/shared';
import { api } from '@/lib/api';
import { ENDPOINTS, ROUTES } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

type ResetForm = {
  token: string;
  password: string;
  passwordConfirm: string;
};

/** ResetPasswordPage — define nova password a partir de token. */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get('token') ?? '', password: '', passwordConfirm: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      await api.post(ENDPOINTS.auth.resetPassword, data, { public: true });
      setDone(true);
      toast.success(t('auth.reset.success'));
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message ?? t('errors.serverError'));
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
          <CardTitle className="text-2xl">{t('auth.reset.title')}</CardTitle>
          <CardDescription>{t('auth.reset.submit')}</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <Alert variant="success">
              <AlertDescription>{t('auth.reset.success')}</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register('token')} />
              <div className="space-y-2">
                <Label htmlFor="password">{t('profile.newPassword')}</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-9" placeholder="••••••••" {...register('password')} />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">{t('profile.confirmPassword')}</Label>
                <Input id="passwordConfirm" type="password" placeholder="••••••••" {...register('passwordConfirm')} />
                {errors.passwordConfirm && (
                  <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Save className="h-4 w-4" />
                {isSubmitting ? t('common.loading') : t('auth.reset.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
