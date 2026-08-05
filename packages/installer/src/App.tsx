/**
 * CARSAI HOST -- Installer wizard container.
 *
 * 9-step setup wizard. State for the whole form is kept here and passed
 * down to each step as a controlled value + setter. Each step validates
 * its own slice (Zod) before the user can proceed.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { WelcomeStep } from './steps/WelcomeStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { DatabaseStep } from './steps/DatabaseStep';
import { AdminUserStep } from './steps/AdminUserStep';
import { MofhCredentialsStep } from './steps/MofhCredentialsStep';
import { SmtpStep } from './steps/SmtpStep';
import { SiteSettingsStep } from './steps/SiteSettingsStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { SuccessStep } from './steps/SuccessStep';
import type {
  AdminUserForm,
  MofhForm,
  SiteSettingsForm,
  SmtpForm,
} from './lib/types';
import { cn } from './lib/utils';

export interface WizardState {
  admin: AdminUserForm;
  mofh: MofhForm;
  smtp: SmtpForm;
  site: SiteSettingsForm;
}

export interface StepDef {
  key: string;
  title: string;
  subtitle: string;
}

const STEPS: StepDef[] = [
  { key: 'welcome', title: 'Welcome', subtitle: 'Verify install state' },
  { key: 'requirements', title: 'Requirements', subtitle: 'System checks' },
  { key: 'database', title: 'Database', subtitle: 'SQLite + migrations' },
  { key: 'admin', title: 'Admin user', subtitle: 'Initial administrator' },
  { key: 'mofh', title: 'MOFH', subtitle: 'iFastNet credentials' },
  { key: 'smtp', title: 'SMTP', subtitle: 'Outgoing email' },
  { key: 'site', title: 'Site settings', subtitle: 'Name, locale, TZ' },
  { key: 'confirm', title: 'Confirm', subtitle: 'Review + run install' },
  { key: 'success', title: 'Done', subtitle: 'Installation complete' },
];

const DEFAULT_STATE: WizardState = {
  admin: {
    adminEmail: '',
    adminUsername: 'admin',
    adminPassword: '',
    adminPasswordConfirm: '',
  },
  mofh: {
    mofhResellerUser: '',
    mofhResellerPassword: '',
    mofhDefaultDomain: 'yoursite.com',
  },
  smtp: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
  },
  site: {
    siteName: 'CARSAI HOST',
    defaultLocale: 'pt',
    timezone: 'Europe/Lisbon',
  },
};

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  // When the install succeeds the success step shows; we use this to
  // disable the back button and lock navigation.
  const [installed, setInstalled] = useState(false);

  const step = STEPS[stepIndex];

  const goTo = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }, []);

  const next = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);
  const back = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex]);

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Scroll to top on step change for a better wizard UX.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [stepIndex]);

  // Hide navigation on Welcome (step 0) and Success (last step).
  const showNav = useMemo(
    () => stepIndex > 0 && stepIndex < STEPS.length - 1 && !installed,
    [stepIndex, installed],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">CARSAI HOST</p>
              <p className="text-xs text-muted-foreground leading-tight">Installer</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Step {Math.min(stepIndex + 1, STEPS.length)} of {STEPS.length}
          </div>
        </div>
      </header>

      {/* Step indicator */}
      {stepIndex > 0 && stepIndex < STEPS.length - 1 && (
        <div className="border-b border-border bg-card/20">
          <div className="container mx-auto max-w-6xl px-6 py-4">
            <StepIndicator steps={STEPS} currentIndex={stepIndex} />
          </div>
        </div>
      )}

      {/* Step content */}
      <main className="container mx-auto max-w-3xl px-6 py-8">
        <div key={step.key} className="animate-fade-in">
          {step.key === 'welcome' && (
            <WelcomeStep onNext={next} onLocked={() => setInstalled(true)} />
          )}
          {step.key === 'requirements' && <RequirementsStep onNext={next} onBack={back} />}
          {step.key === 'database' && <DatabaseStep onNext={next} onBack={back} />}
          {step.key === 'admin' && (
            <AdminUserStep
              value={state.admin}
              onChange={(v) => update('admin', v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step.key === 'mofh' && (
            <MofhCredentialsStep
              value={state.mofh}
              onChange={(v) => update('mofh', v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step.key === 'smtp' && (
            <SmtpStep
              value={state.smtp}
              adminEmail={state.admin.adminEmail}
              onChange={(v) => update('smtp', v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step.key === 'site' && (
            <SiteSettingsStep
              value={state.site}
              onChange={(v) => update('site', v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step.key === 'confirm' && (
            <ConfirmStep
              state={state}
              onBack={back}
              onSuccess={() => {
                setInstalled(true);
                next();
              }}
            />
          )}
          {step.key === 'success' && <SuccessStep state={state} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-4">
        <div className="container mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          CARSAI HOST Installer &middot; Setup wizard runs only once. The
          <code className={cn('mx-1 rounded bg-muted px-1.5 py-0.5 font-mono')}>/install</code>
          route is locked after the install lockfile is written.
        </div>
      </footer>
    </div>
  );
}

/** Generic back/next nav used by some steps. */
export function StepNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  backDisabled,
  children,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            className="installer-btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>
        )}
        {children}
      </div>
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="installer-btn-primary"
        >
          {nextLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
