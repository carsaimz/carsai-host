/**
 * CARSAI HOST -- Database setup step.
 *
 * Lets the user override the SQLite database path (optional) and runs a
 * connection test + migrations via POST /api/v1/install/test-db.
 */
import { useState } from 'react';
import { Database, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { installApi } from '../lib/api';
import type { TestDbResult } from '../lib/types';
import { StepNav } from '../App';

export interface DatabaseStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function DatabaseStep({ onNext, onBack }: DatabaseStepProps) {
  const [databaseUrl, setDatabaseUrl] = useState('./data/carsai.db');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestDbResult | null>(null);
  const [error, setError] = useState<string>('');

  const test = async () => {
    setTesting(true);
    setError('');
    setResult(null);
    try {
      const res = await installApi.testDb({ databaseUrl });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database test failed.');
    } finally {
      setTesting(false);
    }
  };

  const ok = result?.connected === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Database setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          CARSAI HOST uses SQLite as its database. The installer will create the
          database file and apply all pending migrations.
        </p>
      </div>

      <div className="installer-card space-y-4 p-5">
        <div>
          <label htmlFor="db-path" className="installer-label">
            SQLite database path
          </label>
          <input
            id="db-path"
            type="text"
            value={databaseUrl}
            onChange={(e) => setDatabaseUrl(e.target.value)}
            placeholder="./data/carsai.db"
            className="installer-input font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Relative to the API server working directory. Default:
            <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono">./data/carsai.db</code>
          </p>
        </div>

        <button
          type="button"
          onClick={() => void test()}
          disabled={testing || !databaseUrl.trim()}
          className="installer-btn-secondary"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Database className="h-4 w-4" aria-hidden="true" />
          )}
          Test connection &amp; run migrations
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
                {ok ? 'Database ready' : 'Database test failed'}
              </p>
              <p className="text-muted-foreground">{result.message}</p>
              {ok && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Migrations applied: <span className="font-mono">{result.migrationsApplied}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Why SQLite?</p>
        <p className="mt-1">
          SQLite is fast, serverless, and perfect for a single-node hosting panel.
          The database is a single file in
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono">packages/api/data/</code>
          which makes backups trivial. See packages/docs/ARCHITECTURE.md for the
          full rationale and migration path to Postgres.
        </p>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue"
        nextDisabled={!ok}
      />
    </div>
  );
}
