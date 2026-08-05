import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Server, Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createAccountSchema } from '@carsai/shared';
import { api } from '@/lib/api';
import { ENDPOINTS, ROUTES } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

type Form = {
  domain: string;
  customDomain?: string;
  package: string;
  acceptTos: boolean;
};

/** CreateAccountPage — formulario de nova conta de hospedagem. */
export function CreateAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { domain: '', customDomain: '', package: 'freehosting', acceptTos: false as unknown as true },
  });

  const useCustom = watch('customDomain') && watch('customDomain')!.length > 0;

  const onSubmit = async (data: Form) => {
    try {
      const result = await api.post<{ id: string }>(ENDPOINTS.accounts.create, data);
      toast.success(t('success.created'));
      navigate(`${ROUTES.DASHBOARD_ACCOUNTS}/${result.id}`);
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message ?? t('errors.serverError'));
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.DASHBOARD_ACCOUNTS}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {t('accounts.form.title')}
          </CardTitle>
          <CardDescription>{t('common.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="domain">{t('accounts.form.domainLabel')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="domain"
                  placeholder={t('accounts.form.domainPlaceholder')}
                  {...register('domain')}
                  disabled={!!useCustom}
                />
                <span className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  .epizy.com
                </span>
              </div>
              {errors.domain && <p className="text-xs text-destructive">{errors.domain.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">{t('accounts.form.customDomain')}</Label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customDomain"
                  className="pl-9"
                  placeholder={t('accounts.form.customDomainPlaceholder')}
                  {...register('customDomain')}
                />
              </div>
              {errors.customDomain && (
                <p className="text-xs text-destructive">{errors.customDomain.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="package">{t('accounts.form.packageLabel')}</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
                <Server className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Free Hosting</p>
                  <p className="text-xs text-muted-foreground">Plano unico — 100% gratuito</p>
                </div>
                <input type="hidden" {...register('package')} />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="acceptTos" {...register('acceptTos')} />
              <Label htmlFor="acceptTos" className="text-sm font-normal leading-snug">
                {t('accounts.form.tosLabel')}
              </Label>
            </div>
            {errors.acceptTos && (
              <p className="text-xs text-destructive">{errors.acceptTos.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Rocket className="h-4 w-4" />
              {isSubmitting ? t('accounts.status.creating') : t('accounts.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateAccountPage;
