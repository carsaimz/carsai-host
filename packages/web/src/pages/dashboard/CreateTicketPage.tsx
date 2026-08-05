import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LifeBuoy, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createTicketSchema } from '@carsai/shared';
import { api } from '@/lib/api';
import { ENDPOINTS, ROUTES } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

type Form = {
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department: 'general' | 'technical' | 'abuse' | 'billing';
};

/** CreateTicketPage — abrir novo ticket. */
export function CreateTicketPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', body: '', priority: 'normal', department: 'general' },
  });

  const priority = watch('priority');
  const department = watch('department');

  const onSubmit = async (data: Form) => {
    try {
      const result = await api.post<{ id: string }>(ENDPOINTS.tickets.create, data);
      toast.success(t('success.created'));
      navigate(`${ROUTES.DASHBOARD_TICKETS}/${result.id}`);
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message ?? t('errors.serverError'));
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.DASHBOARD_TICKETS}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            {t('tickets.new')}
          </CardTitle>
          <CardDescription>{t('tickets.title')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('tickets.subject')}</Label>
              <Input id="subject" placeholder="Assunto" {...register('subject')} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('tickets.priority')}</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setValue('priority', v as Form['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('tickets.priority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tickets.priorities.low')}</SelectItem>
                    <SelectItem value="normal">{t('tickets.priorities.normal')}</SelectItem>
                    <SelectItem value="high">{t('tickets.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('tickets.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.department')}</Label>
                <Select
                  value={department}
                  onValueChange={(v) => setValue('department', v as Form['department'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('tickets.department')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('tickets.departments.general')}</SelectItem>
                    <SelectItem value="technical">{t('tickets.departments.technical')}</SelectItem>
                    <SelectItem value="abuse">{t('tickets.departments.abuse')}</SelectItem>
                    <SelectItem value="billing">{t('tickets.departments.billing')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">{t('tickets.body')}</Label>
              <Textarea id="body" rows={8} placeholder="Descreva o seu problema..." {...register('body')} />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Send className="h-4 w-4" />
              {isSubmitting ? t('common.loading') : t('common.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateTicketPage;
