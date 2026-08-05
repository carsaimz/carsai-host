/**
 * CARSAI HOST -- Installer Welcome step.
 *
 * Calls GET /api/v1/install/status on mount. If the platform is already
 * installed, shows the "Already installed" notice with a link to the
 * login page; otherwise lets the user proceed.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { installApi } from '../lib/api';
import { formatDate } from '../lib/utils';

export interface WelcomeStepProps {
  onNext: () => void;
  onLocked: () => void;
}

export function WelcomeStep({ onNext, onLocked }: WelcomeStepProps) {
  const [status, setStatus] = useState<'loading' | 'installed' | 'not-installed' | 'error'>(
    'loading',
  );
  const [installedAt, setInstalledAt] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const check = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await installApi.getStatus();
      if (res.installed) {
        setStatus('installed');
        setInstalledAt(res.installedAt);
        onLocked();
      } else {
        setStatus('not-installed');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reach the API.');
    }
  };

  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to CARSAI HOST</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This wizard will guide you through the initial setup of your free hosting
          platform. It takes about 5 minutes and runs only once.
        </p>
      </div>

      <div className="installer-card p-5">
        {status === 'loading' && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking install status...
          </div>
        )}

        {status === 'not-installed' && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Ready to install</p>
              <p className="text-muted-foreground">
                No previous installation detected. You can proceed with the setup wizard.
              </p>
            </div>
          </div>
        )}

        {status === 'installed' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 text-warning" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Already installed</p>
                <p className="text-muted-foreground">
                  CARSAI HOST has already been installed on this server. The
                  <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    /install
                  </code>
                  route is now locked.
                </p>
                {installedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Installed at: <span className="font-mono">{formatDate(installedAt)}</span>
                  </p>
                )}
              </div>
            </div>
            <a
              href="/login"
              className="installer-btn-primary inline-flex no-underline"
            >
              Go to login <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 text-destructive"
                aria-hidden="true"
              />
              <div className="text-sm">
                <p className="font-medium text-foreground">Cannot reach the API</p>
                <p className="text-muted-foreground">
                  The installer could not contact the backend at
                  <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    /api/v1/install/status
                  </code>
                  Make sure the API server is running on port 3000.
                </p>
                {errorMsg && (
                  <p className="mt-1 font-mono text-[11px] text-destructive/80 break-all">
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => void check()} className="installer-btn-secondary">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Make sure the API server (port 3000) is running.</li>
          <li>Have your iFastNet (Byet) reseller username and password ready.</li>
          <li>Have your SMTP credentials ready (host, port, user, password, from).</li>
          <li>The data directory must be writable by the API process.</li>
        </ul>
      </div>

      {status === 'not-installed' && (
        <div className="flex justify-end">
          <button onClick={onNext} className="installer-btn-primary">
            Start installation <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
