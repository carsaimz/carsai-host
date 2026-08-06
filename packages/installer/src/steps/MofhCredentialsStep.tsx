/**
 * CARSAI HOST -- MOFH (iFastNet / Byet) credentials step.
 *
 * Collects reseller username, reseller password and the default domain
 * for new hosting accounts. A "Test connection" button calls the MOFH
 * API (POST /api/v1/install/test-mofh) using the domainavailability
 * operation to verify the credentials work.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, KeyRound, Loader2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import type { MofhForm, TestMofhResult } from '../lib/types';
import { installApi } from '../lib/api';
import { StepNav } from '../App';

const mofhSchema = z.object({
  mofhResellerUser: z.string().min(3, 'Minimo 3 caracteres').max(50),
  mofhResellerPassword: z.string().min(6, 'Minimo 6 caracteres').max(100),
  mofhDefaultDomain: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, 'Dominio invalido'),
});

type MofhFormValues = z.infer<typeof mofhSchema>;

export interface MofhCredentialsStepProps {
  value: MofhForm;
  onChange: (v: MofhForm) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MofhCredentialsStep({ value, onChange, onNext, onBack }: MofhCredentialsStepProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestMofhResult | null>(null);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<MofhFormValues>({
    resolver: zodResolver(mofhSchema),
    defaultValues: value,
    mode: 'onChange',
  });

  const submit = (data: MofhFormValues) => {
    onChange(data);
    onNext();
  };

  const test = async () => {
    const v = getValues();
    if (!v.mofhResellerUser || !v.mofhResellerPassword || !v.mofhDefaultDomain) return;
    setTesting(true);
    setError('');
    setResult(null);
    try {
      const res = await installApi.testMofh({
        mofhResellerUser: v.mofhResellerUser,
        mofhResellerPassword: v.mofhResellerPassword,
        mofhDefaultDomain: v.mofhDefaultDomain,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MOFH test failed.');
    } finally {
      setTesting(false);
    }
  };

  const ok = result?.connected === true;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">MOFH credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          CARSAI HOST integrates with iFastNet (Byet) via the My Own Free Hosting
          (MOFH) XML-RPC API. Enter your reseller credentials here. They will be
          stored in the
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code>
          file on the API server.
        </p>
      </div>

      <div className="installer-card space-y-4 p-5">
        <div>
          <label htmlFor="mofh-user" className="installer-label">
            Reseller username
          </label>
          <input
            id="mofh-user"
            type="text"
            autoComplete="off"
            placeholder="your-reseller-username"
            className="installer-input"
            {...register('mofhResellerUser')}
          />
          {errors.mofhResellerUser && (
            <p className="mt-1 text-xs text-destructive">{errors.mofhResellerUser.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="mofh-pass" className="installer-label">
            Reseller password
          </label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="mofh-pass"
              type="password"
              autoComplete="off"
              placeholder="********"
              className="installer-input pl-9"
              {...register('mofhResellerPassword')}
            />
          </div>
          {errors.mofhResellerPassword && (
            <p className="mt-1 text-xs text-destructive">
              {errors.mofhResellerPassword.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mofh-domain" className="installer-label">
            Default domain
          </label>
          <div className="relative">
            <Globe
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="mofh-domain"
              type="text"
              autoComplete="off"
              placeholder="yoursite.com"
              className="installer-input pl-9"
              {...register('mofhDefaultDomain')}
            />
          </div>
          {errors.mofhDefaultDomain && (
            <p className="mt-1 text-xs text-destructive">{errors.mofhDefaultDomain.message}</p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            The default free hosting domain (e.g.
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono">yoursite.com</code>).
            New accounts become subdomains of this domain unless a custom domain is provided.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void test()}
            disabled={testing || !isValid}
            className="installer-btn-secondary"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plug className="h-4 w-4" aria-hidden="true" />
            )}
            Test connection
          </button>
        </div>

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
                {ok ? 'MOFH connection OK' : 'MOFH connection failed'}
              </p>
              <p className="text-muted-foreground">{result.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How do I get MOFH credentials?</p>
        <p className="mt-1">
          Register as a reseller at iFastNet
          (<a className="underline" href="https://ifastnet.com/affiliate.html" target="_blank" rel="noreferrer">https://ifastnet.com/affiliate.html</a>),
          then log in to the reseller panel at
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono">panel.myownfreehost.com</code>
          to find your API username and password. You can also configure
          these later inside the admin settings panel.
        </p>
      </div>

      <StepNav
        onBack={onBack}
        nextLabel="Continue"
        nextDisabled={!isValid}
        onNext={() => {
          const btn = document.getElementById('mofh-submit') as HTMLButtonElement | null;
          btn?.click();
        }}
      />
      <button id="mofh-submit" type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
        submit
      </button>
    </form>
  );
}
