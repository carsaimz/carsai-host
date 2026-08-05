import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Mail, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { contactSchema } from '@carsai/shared';
import { api } from '@/lib/api';
import { ENDPOINTS } from '@/lib/constants';
import type { ApiError } from '@/lib/api';

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot?: string;
};

/** ContactPage — formulario de contacto. */
export function ContactPage() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  const onSubmit = async (data: ContactForm) => {
    try {
      await api.post(ENDPOINTS.public.contact, data, { public: true });
      toast.success(t('success.sent'));
      reset();
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message ?? t('errors.serverError'));
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t('nav.contact')}
          </CardTitle>
          <CardDescription>
            Envie-nos uma mensagem. Respondemos em menos de 24 horas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Honeypot anti-spam (escondido) */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register('honeypot')}
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
              aria-hidden
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input id="name" placeholder="O seu nome" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input id="email" type="email" placeholder="voce@exemplo.com" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">{t('tickets.subject')}</Label>
              <Input id="subject" placeholder="Assunto" {...register('subject')} />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('tickets.body')}</Label>
              <Textarea id="message" rows={6} placeholder="A sua mensagem..." {...register('message')} />
              {errors.message && (
                <p className="text-xs text-destructive">{errors.message.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              <Send className="h-4 w-4" />
              {isSubmitting ? t('common.loading') : t('common.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContactPage;
