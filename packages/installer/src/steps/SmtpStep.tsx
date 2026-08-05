/**
 * CARSAI HOST -- SMTP configuration step.
 *
 * Collects host, port, user, password, from-address and offers a "Send
 * test email" button (POST /api/v1/install/test-smtp) to verify the
 * configuration.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AtSign, Loader2, Mail, Send, CheckCircle2, XCircle } from 'lucide-react';
import type { SmtpForm, TestSmtpResult } from '../lib/types';
import { installApi } from '../lib/api';
import { StepNav } from '../App';

const smtpSchema = z.object({
  smtpHost: z.string().min(3, 'Minimo 3 caracteres'),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().email('Email invalido').or(z.literal('')).optional(),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

export interface SmtpStepProps {
  value: SmtpForm;
  adminEmail: string;
  onChange: (v: SmtpForm) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SmtpStep({ value, adminEmail, onChange, onNext, onBack }: SmtpStepProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestSmtpResult | null>(null);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: { ...value, smtpPort: Number(value.smtpPort) || 587 },
    mode: 'onChange',
  });

  const submit = (data: SmtpFormValues) => {
    onChange({
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser ?? '',
      smtpPass: data.smtpPass ?? '',
      smtpFrom: data.smtpFrom ?? '',
    });
    onNext();
  };

  const test = async () => {
    const v = getValues();
    if (!v.smtpHost) return;
    setTesting(true);
    setError('');
    setResult(null);
    try {
      const res = await installApi.testSmtp({
        smtpHost: v.smtpHost,
        smtpPort: Number(v.smtpPort),
        smtpUser: v.smtpUser,
        smtpPass: v.smtpPass,
        smtpFrom: v.smtpFrom,
        recipient: adminEmail,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMTP test failed.');
    } finally {
      setTesting(false);
    }
  };

  const ok = result?.sent === true;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">SMTP configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          CARSAI HOST sends transactional email (verification links, password
          resets, ticket replies). Configure an outbound SMTP server here. A
          test email will be sent to the admin address you provided in the
          previous step.
        </p>
      </div>

      <div className="installer-card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="smtp-host" className="installer-label">
              SMTP host
            </label>
            <input
              id="smtp-host"
              type="text"
              autoComplete="off"
              placeholder="smtp.gmail.com"
              className="installer-input"
              {...register('smtpHost')}
            />
            {errors.smtpHost && (
              <p className="mt-1 text-xs text-destructive">{errors.smtpHost.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="smtp-port" className="installer-label">
              Port
            </label>
            <input
              id="smtp-port"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              placeholder="587"
              className="installer-input w-24"
              {...register('smtpPort')}
            />
            {errors.smtpPort && (
              <p className="mt-1 text-xs text-destructive">{errors.smtpPort.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="smtp-user" className="installer-label">
              SMTP user
            </label>
            <input
              id="smtp-user"
              type="text"
              autoComplete="off"
              placeholder="noreply@carsai.host"
              className="installer-input"
              {...register('smtpUser')}
            />
          </div>
          <div>
            <label htmlFor="smtp-pass" className="installer-label">
              SMTP password
            </label>
            <input
              id="smtp-pass"
              type="password"
              autoComplete="off"
              placeholder="********"
              className="installer-input"
              {...register('smtpPass')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="smtp-from" className="installer-label">
            From address
          </label>
          <div className="relative">
            <AtSign
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="smtp-from"
              type="email"
              autoComplete="off"
              placeholder="CARSAI HOST <noreply@carsai.host>"
              className="installer-input pl-9"
              {...register('smtpFrom')}
            />
          </div>
          {errors.smtpFrom && (
            <p className="mt-1 text-xs text-destructive">{errors.smtpFrom.message}</p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Either a bare email (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">noreply@carsai.host</code>
            ) or a formatted name+email (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              CARSAI HOST &lt;noreply@carsai.host&gt;
            </code>
            ).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void test()}
          disabled={testing || !isValid || !adminEmail}
          className="installer-btn-secondary"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send test email
          {adminEmail ? (
            <span className="text-xs text-muted-foreground">(to {adminEmail})</span>
          ) : null}
        </button>

        {error && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Test failed</p>
              <p className="font-mono text-[11px] text-destructive/80 break-all">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div
            className={
              ok
                ? 'flex items-start gap-3 rounded-md border border-success/30 bg-success/5 p-3'
                : 'flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3'
            }
          >
            {ok ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {ok ? 'Test email sent' : 'Test email failed'}
              </p>
              <p className="text-muted-foreground">{result.message}</p>
              {ok && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" aria-hidden="true" /> Check the inbox at{' '}
                  {adminEmail}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <StepNav
        onBack={onBack}
        nextLabel="Continue"
        nextDisabled={!isValid}
        onNext={() => {
          const btn = document.getElementById('smtp-submit') as HTMLButtonElement | null;
          btn?.click();
        }}
      />
      <button id="smtp-submit" type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
        submit
      </button>
    </form>
  );
}
