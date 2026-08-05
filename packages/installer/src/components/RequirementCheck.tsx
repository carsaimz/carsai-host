/**
 * CARSAI HOST -- Requirement check row.
 *
 * Renders a single system-requirement check with a green/red indicator,
 * a label, and an optional details string.
 */
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface RequirementCheckProps {
  label: string;
  status: 'pass' | 'fail' | 'pending';
  message?: string;
  details?: string;
}

export function RequirementCheck({ label, status, message, details }: RequirementCheckProps) {
  const Icon = status === 'pass' ? CheckCircle2 : status === 'fail' ? XCircle : AlertCircle;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border p-3',
        status === 'pass' && 'border-success/30 bg-success/5',
        status === 'fail' && 'border-destructive/30 bg-destructive/5',
        status === 'pending' && 'border-border bg-muted/30',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0',
          status === 'pass' && 'text-success',
          status === 'fail' && 'text-destructive',
          status === 'pending' && 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        {details && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80 break-all">
            {details}
          </p>
        )}
      </div>
      <span
        className={cn(
          'ml-2 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          status === 'pass' && 'bg-success/15 text-success',
          status === 'fail' && 'bg-destructive/15 text-destructive',
          status === 'pending' && 'bg-muted text-muted-foreground',
        )}
      >
        {status}
      </span>
    </div>
  );
}
