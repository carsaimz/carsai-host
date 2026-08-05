import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { LogIn, Server, Mail, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { loginSchema } from '@carsai/shared';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@carsai/shared';
import type { ApiError } from '@/lib/api';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
  twoFactorCode?: string;
};

/** LoginPage — autenticacao por email + password (com 2FA opcional). */
export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show2fa, setShow2fa] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.DASHBOARD;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (data: LoginForm) => {
    setGeneralError(null);
    try {
      await login(data.email, data.password, data.remember, data.twoFactorCode);
      toast.success(t('common.appName'));
      navigate(from, { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'TWO_FACTOR_REQUIRED') {
        setShow2fa(true);
        setGeneralError(null);
      } else {
        setGeneralError(err.message ?? t('auth.login.invalidCredentials'));
      }
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
          <CardTitle className="text-2xl">{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9" placeholder="voce@exemplo.com" {...register('email')} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Link to={ROUTES.LOGIN + '/forgot'} className="text-xs text-primary hover:underline">
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {show2fa && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">{t('auth.login.twoFactorTitle')}</Label>
                <Input
                  id="twoFactorCode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  {...register('twoFactorCode')}
                />
                <p className="text-xs text-muted-foreground">{t('auth.login.twoFactorSubtitle')}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="remember" {...register('remember')} />
              <Label htmlFor="remember" className="text-sm font-normal">
                {t('auth.login.rememberMe')}
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="h-4 w-4" />
              {isSubmitting ? t('common.loading') : t('auth.login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.login.noAccount')}{' '}
            <Link to={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
