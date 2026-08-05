/**
 * CARSAI HOST -- Admin user creation step.
 *
 * react-hook-form + zod (installerSchema.pick) validates the admin slice:
 * adminEmail, adminUsername, adminPassword, adminPasswordConfirm.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Mail, User } from 'lucide-react';
import type { AdminUserForm } from '../lib/types';
import { StepNav } from '../App';

// Pick the admin slice from the shared installerSchema so we get the
// exact same rules (min/max length, regex, password match) as the backend.
const adminSchema = z
  .object({
    adminEmail: z.string().email('Email invalido'),
    adminUsername: z
      .string()
      .min(3, 'Minimo 3 caracteres')
      .max(20, 'Maximo 20 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, numeros e _'),
    adminPassword: z
      .string()
      .min(8, 'Minimo 8 caracteres')
      .max(72, 'Maximo 72 caracteres')
      .regex(/[A-Z]/, 'Requer pelo menos 1 maiuscula')
      .regex(/[a-z]/, 'Requer pelo menos 1 minuscula')
      .regex(/[0-9]/, 'Requer pelo menos 1 numero'),
    adminPasswordConfirm: z.string(),
  })
  .refine((d) => d.adminPassword === d.adminPasswordConfirm, {
    message: 'As palavras-passe nao coincidem',
    path: ['adminPasswordConfirm'],
  });

type AdminForm = z.infer<typeof adminSchema>;

export interface AdminUserStepProps {
  value: AdminUserForm;
  onChange: (v: AdminUserForm) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AdminUserStep({ value, onChange, onNext, onBack }: AdminUserStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: value,
    mode: 'onChange',
  });

  const submit = (data: AdminForm) => {
    onChange(data);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Admin user</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the initial administrator account. This user will have full
          access to the admin panel and is created with the
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">admin</code>
          role, status
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">active</code>
          and a verified email.
        </p>
      </div>

      <div className="installer-card space-y-4 p-5">
        <div>
          <label htmlFor="admin-email" className="installer-label">
            Admin email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              className="installer-input pl-9"
              {...register('adminEmail')}
            />
          </div>
          {errors.adminEmail && (
            <p className="mt-1 text-xs text-destructive">{errors.adminEmail.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="admin-username" className="installer-label">
            Admin username
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              placeholder="admin"
              className="installer-input pl-9"
              {...register('adminUsername')}
            />
          </div>
          {errors.adminUsername && (
            <p className="mt-1 text-xs text-destructive">{errors.adminUsername.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-password" className="installer-label">
              Password
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="admin-password"
                type="password"
                autoComplete="new-password"
                placeholder="********"
                className="installer-input pl-9"
                {...register('adminPassword')}
              />
            </div>
            {errors.adminPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.adminPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="admin-password-confirm" className="installer-label">
              Confirm password
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="admin-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="********"
                className="installer-input pl-9"
                {...register('adminPasswordConfirm')}
              />
            </div>
            {errors.adminPasswordConfirm && (
              <p className="mt-1 text-xs text-destructive">
                {errors.adminPasswordConfirm.message}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Password must be 8-72 chars and include an uppercase letter, a lowercase
          letter and a number. The password is hashed with bcrypt (cost 12).
        </p>
      </div>

      <StepNav
        onBack={onBack}
        nextLabel="Continue"
        nextDisabled={!isValid}
        onNext={() => {
          // handleSubmit is invoked on submit click; trigger it programmatically
          // by clicking the hidden submit button below.
          const btn = document.getElementById('admin-submit') as HTMLButtonElement | null;
          btn?.click();
        }}
      />

      {/* Hidden submit button so the form's handleSubmit runs. */}
      <button id="admin-submit" type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
        submit
      </button>
    </form>
  );
}
