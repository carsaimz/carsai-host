/**
 * CARSAI HOST -- Site settings step.
 *
 * Collects site name, default locale (PT/EN/FR/ES) and timezone.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, Languages } from 'lucide-react';
import type { SiteSettingsForm } from '../lib/types';
import { COMMON_TIMEZONES, LOCALE_LABELS } from '../lib/utils';
import { StepNav } from '../App';

const siteSchema = z.object({
  siteName: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  defaultLocale: z.enum(['pt', 'en', 'fr', 'es']),
  timezone: z.string().min(1, 'Obrigatorio').max(50),
});

type SiteFormValues = z.infer<typeof siteSchema>;

export interface SiteSettingsStepProps {
  value: SiteSettingsForm;
  onChange: (v: SiteSettingsForm) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SiteSettingsStep({ value, onChange, onNext, onBack }: SiteSettingsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: value,
    mode: 'onChange',
  });

  const submit = (data: SiteFormValues) => {
    onChange(data);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Site settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These values define how the platform presents itself to visitors. They
          are written to the API
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code>
          and can be changed later in the admin panel.
        </p>
      </div>

      <div className="installer-card space-y-4 p-5">
        <div>
          <label htmlFor="site-name" className="installer-label">
            Site name
          </label>
          <input
            id="site-name"
            type="text"
            autoComplete="off"
            placeholder="CARSAI HOST"
            className="installer-input"
            {...register('siteName')}
          />
          {errors.siteName && (
            <p className="mt-1 text-xs text-destructive">{errors.siteName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="default-locale" className="installer-label">
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Default locale
              </span>
            </label>
            <select
              id="default-locale"
              className="installer-input"
              {...register('defaultLocale')}
            >
              {(['pt', 'en', 'fr', 'es'] as const).map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The default UI language. Users can switch languages from the header.
            </p>
          </div>

          <div>
            <label htmlFor="timezone" className="installer-label">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Timezone
              </span>
            </label>
            <select id="timezone" className="installer-input" {...register('timezone')}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {errors.timezone && (
              <p className="mt-1 text-xs text-destructive">{errors.timezone.message}</p>
            )}
          </div>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        nextLabel="Review"
        nextDisabled={!isValid}
        onNext={() => {
          const btn = document.getElementById('site-submit') as HTMLButtonElement | null;
          btn?.click();
        }}
      />
      <button id="site-submit" type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
        submit
      </button>
    </form>
  );
}
