/**
 * CARSAI HOST -- Confirm + run install step.
 *
 * Shows a summary of every value collected so far, then calls
 * POST /api/v1/install/run. While the request is in-flight we show a
 * spinner; on success we call onSuccess() which advances to the
 * SuccessStep.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Rocket } from 'lucide-react';
import type { WizardState } from '../App';
import { installApi } from '../lib/api';
import type { InstallRunResult } from '../lib/types';
import { LOCALE_LABELS } from '../lib/utils';

export interface ConfirmStepProps {
  state: WizardState;
  onBack: () => void;
  onSuccess: (result: InstallRunResult) => void;
}

interface Row {
  label: string;
  value: string;
  mono?: boolean;
}

export function ConfirmStep({ state, onBack, onSuccess }: ConfirmStepProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<InstallRunResult | null>(null);

  const rows: Row[] = [
    { label: 'Site name', value: state.site.siteName },
    { label: 'Default locale', value: LOCALE_LABELS[state.site.defaultLocale] },
    { label: 'Timezone', value: state.site.timezone, mono: true },
    { label: 'Admin email', value: state.admin.adminEmail, mono: true },
    { label: 'Admin username', value: state.admin.adminUsername, mono: true },
    {
      label: 'Admin password',
      value: state.admin.adminPassword ? '******** (will be hashed with bcrypt)' : '(empty)',
    },
    { label: 'MOFH reseller user', value: state.mofh.mofhResellerUser, mono: true },
    {
      label: 'MOFH reseller password',
      value: state.mofh.mofhResellerPassword ? '********' : '(empty)',
    },
    { label: 'MOFH default domain', value: state.mofh.mofhDefaultDomain, mono: true },
    { label: 'SMTP host', value: state.smtp.smtpHost, mono: true },
    { label: 'SMTP port', value: String(state.smtp.smtpPort), mono: true },
    { label: 'SMTP user', value: state.smtp.smtpUser || '(none)', mono: true },
    {
      label: 'SMTP password',
      value: state.smtp.smtpPass ? '********' : '(none)',
    },
    {
      label: 'SMTP from',
      value: state.smtp.smtpFrom || '(none)',
      mono: true,
    },
  ];

  const run = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await installApi.run({
        siteName: state.site.siteName,
        adminEmail: state.admin.adminEmail,
        adminUsername: state.admin.adminUsername,
        adminPassword: state.admin.adminPassword,
        adminPasswordConfirm: state.admin.adminPasswordConfirm,
        mofhResellerUser: state.mofh.mofhResellerUser,
        mofhResellerPassword: state.mofh.mofhResellerPassword,
        mofhDefaultDomain: state.mofh.mofhDefaultDomain,
        smtpHost: state.smtp.smtpHost,
        smtpPort: Number(state.smtp.smtpPort),
        smtpUser: state.smtp.smtpUser,
        smtpPass: state.smtp.smtpPass,
        smtpFrom: state.smtp.smtpFrom,
        defaultLocale: state.site.defaultLocale,
        timezone: state.site.timezone,
      });
      setResult(res);
      onSuccess(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Confirm and install</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the configuration below. When you click "Run install", the
          backend will:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Create the admin user (role=admin, status=active, email verified).</li>
          <li>Write all values to the <code className="rounded bg-muted px-1.5 py-0.5 font-mono">.env</code> file.</li>
          <li>Write the <code className="rounded bg-muted px-1.5 py-0.5 font-mono">data/.installed</code> lockfile.</li>
          <li>Lock the <code className="rounded bg-muted px-1.5 py-0.5 font-mono">/install</code> route.</li>
        </ol>
      </div>

      <div className="installer-card overflow-hidden">
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {r.label}
              </dt>
              <dd className={'text-sm text-foreground ' + (r.mono ? 'font-mono break-all' : '')}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Installation failed</p>
            <p className="font-mono text-[11px] text-destructive/80 break-all">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No lockfile was written. Fix the issue and try again. The admin user may
              have been created if the failure happened after that step &mdash; delete
              them from the database before retrying.
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/5 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Install succeeded</p>
            <p className="text-muted-foreground">{result.adminLoginUrl}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={running}
          className="installer-btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || !!result}
          className="installer-btn-primary"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Rocket className="h-4 w-4" aria-hidden="true" />
          )}
          {running ? 'Installing...' : 'Run install'}
        </button>
      </div>
    </div>
  );
}
