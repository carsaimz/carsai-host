/**
 * CARSAI HOST -- Success step.
 *
 * Final screen after a successful install. Shows the admin login URL and
 * warns that the /install route is now locked.
 */
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import type { WizardState } from '../App';

export interface SuccessStepProps {
  state: WizardState;
}

export function SuccessStep({ state }: SuccessStepProps) {
  const loginUrl = '/login';
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Installation complete</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          CARSAI HOST is now ready. The admin account
          (<span className="font-mono">{state.admin.adminEmail}</span>) has been
          created and the install lockfile has been written.
        </p>
      </div>

      <div className="installer-card mx-auto max-w-md p-5 text-left">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 text-warning" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-foreground">/install is now locked</p>
            <p className="text-muted-foreground">
              For security reasons the installer route returns
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">403</code>
              from now on. To re-run the installer, remove the lockfile at
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                packages/api/data/.installed
              </code>
              and restart the API.
            </p>
          </div>
        </div>
      </div>

      <div className="installer-card mx-auto max-w-md p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next steps
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
          <li>Log in to the admin panel with your admin credentials.</li>
          <li>Verify the SMTP configuration by sending a test email from the admin panel.</li>
          <li>Customize your branding (logo, colors) under Admin &rarr; Settings.</li>
          <li>Review the SECURITY.md file at the repo root for the security checklist.</li>
        </ol>
      </div>

      <a href={loginUrl} className="installer-btn-primary inline-flex no-underline">
        Go to login <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
