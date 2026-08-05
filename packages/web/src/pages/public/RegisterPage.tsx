import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { UserPlus, Server, Mail, KeyRound, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { registerSchema } from '@carsai/shared';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@carsai/shared';
import type { ApiError } from '@/lib/api';

type RegisterForm = {
  email: string;
  username: string;
  password: string;
  passwordConfirm: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
};

/** RegisterPage — criacao de conta de utilizador. */
export function RegisterPage() {
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      passwordConfirm: '',
      firstName: '',
      lastName: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const result = await registerUser(data);
      toast.success(t('auth.register.success'));
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`);
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
          <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
          <CardDescription>{t('auth.register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9" placeholder="voce@exemplo.com" {...register('email')} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t('common.username')}</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" className="pl-9" placeholder="utilizador" {...register('username')} />
              </div>
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" placeholder="Nome" {...register('firstName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apelido</Label>
                <Input id="lastName" placeholder="Apelido" {...register('lastName')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('common.password')}</Label>
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

            <div className="flex items-start gap-2">
              <Checkbox id="acceptTerms" {...register('acceptTerms')} />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
                {t('auth.register.acceptTerms')}{' '}
                <Link to={ROUTES.TERMS} className="text-primary hover:underline">{t('footer.terms')}</Link>{' '}
                &amp;{' '}
                <Link to={ROUTES.PRIVACY} className="text-primary hover:underline">{t('footer.privacy')}</Link>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? t('common.loading') : t('auth.register.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.register.haveAccount')}{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
