/**
 * CARSAI HOST -- Installer shared types
 *
 * Mirrors the shapes returned by /api/v1/install/* on the backend.
 * The runtime validation lives in @carsai/shared (installerSchema).
 */
import type { z } from 'zod';
import type { installerSchema } from '@carsai/shared';

export type InstallerInput = z.infer<typeof installerSchema>;

/** Subset of InstallerInput used by individual steps (for partial validation). */
export interface AdminUserForm {
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
  adminPasswordConfirm: string;
}

export interface MofhForm {
  mofhResellerUser: string;
  mofhResellerPassword: string;
  mofhDefaultDomain: string;
}

export interface SmtpForm {
  smtpHost: string;
  smtpPort: number | string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export interface SiteSettingsForm {
  siteName: string;
  defaultLocale: 'pt' | 'en' | 'fr' | 'es';
  timezone: string;
}

/** Combined payload sent to POST /api/v1/install/run. */
export type InstallRunInput = InstallerInput & {
  defaultLocale?: 'pt' | 'en' | 'fr' | 'es';
  timezone?: string;
};

// ─── Backend responses ────────────────────────────────────────
export interface InstallStatus {
  installed: boolean;
  installedAt?: string;
}

export interface RequirementsResult {
  checks: RequirementCheck[];
  allPassed: boolean;
}

export interface RequirementCheck {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  details?: string;
}

export interface InstallRunResult {
  success: boolean;
  adminLoginUrl: string;
  installedAt: string;
  warnings?: string[];
}

export interface TestDbInput {
  databaseUrl?: string;
}

export interface TestDbResult {
  connected: boolean;
  migrationsApplied: number;
  message: string;
}

export interface TestMofhInput {
  mofhResellerUser: string;
  mofhResellerPassword: string;
  mofhDefaultDomain: string;
}

export interface TestMofhResult {
  connected: boolean;
  message: string;
}

export interface TestSmtpInput {
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  recipient: string;
}

export interface TestSmtpResult {
  sent: boolean;
  message: string;
}
