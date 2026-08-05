/**
 * CARSAI HOST -- Installer step indicator (horizontal progress).
 *
 * Renders the list of steps with completed / current / upcoming states.
 * On narrow screens it collapses to a simple "Step X of N" label.
 */
import { Check } from 'lucide-react';
import type { StepDef } from '../App';
import { cn } from '../lib/utils';

export interface StepIndicatorProps {
  steps: StepDef[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <>
      {/* Desktop: full stepper */}
      <ol className="hidden md:flex items-center gap-1" aria-label="Progress">
        {steps.slice(1, -1).map((s, i) => {
          const realIndex = i + 1; // skip "Welcome"
          const isComplete = realIndex < currentIndex;
          const isCurrent = realIndex === currentIndex;
          return (
            <li key={s.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isComplete && 'border-success bg-success text-success-foreground',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    !isComplete && !isCurrent && 'border-border bg-muted text-muted-foreground',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-xs font-medium',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {s.title}
                  </span>
                </span>
              </div>
              {i < steps.length - 3 && (
                <span
                  className={cn(
                    'mx-2 h-px flex-1',
                    isComplete ? 'bg-success' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact label */}
      <div className="md:hidden text-sm text-muted-foreground">
        Step <span className="font-semibold text-foreground">{currentIndex}</span> of{' '}
        {steps.length - 2}: <span className="font-medium text-foreground">{steps[currentIndex].title}</span>
      </div>
    </>
  );
}
