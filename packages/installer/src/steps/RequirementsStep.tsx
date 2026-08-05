/**
 * CARSAI HOST -- System requirements step.
 *
 * Calls GET /api/v1/install/requirements and renders the results with
 * green/red indicators. The user can re-run the checks.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { installApi } from '../lib/api';
import type { RequirementCheck as RequirementCheckType } from '../lib/types';
import { RequirementCheck } from '../components/RequirementCheck';
import { StepNav } from '../App';

export interface RequirementsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function RequirementsStep({ onNext, onBack }: RequirementsStepProps) {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<RequirementCheckType[]>([]);
  const [error, setError] = useState<string>('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await installApi.getRequirements();
      setChecks(res.checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run requirement checks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
  }, []);

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System requirements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The installer verifies the runtime environment meets the minimum requirements
          for CARSAI HOST. All checks must pass before you can continue.
        </p>
      </div>

      <div className="installer-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Checks
          </h3>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="installer-btn-ghost"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            Re-run
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse-soft rounded-md border border-border bg-muted/40"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Failed to run checks</p>
              <p className="font-mono text-[11px] text-destructive/80 break-all">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            {checks.map((c) => (
              <RequirementCheck
                key={c.key}
                label={c.label}
                status={c.passed ? 'pass' : 'fail'}
                message={c.message}
                details={c.details}
              />
            ))}
            {checks.length === 0 && (
              <p className="text-sm text-muted-foreground">No checks returned.</p>
            )}
          </div>
        )}
      </div>

      {allPassed && (
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/5 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" aria-hidden="true" />
          <p className="text-sm text-foreground">
            All checks passed. You can proceed to the database setup.
          </p>
        </div>
      )}

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue"
        nextDisabled={!allPassed}
      />
    </div>
  );
}
