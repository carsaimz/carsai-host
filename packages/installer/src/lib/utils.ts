/**
 * CARSAI HOST -- Installer utility helpers
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merger (cn helper, same as shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format an ISO date string into a human-readable date. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Common timezones offered in the Site Settings step. */
export const COMMON_TIMEZONES: string[] = [
  'UTC',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'Africa/Maputo',
  'Africa/Luanda',
  'Asia/Maputo',
];

/** Locale labels for the Site Settings step. */
export const LOCALE_LABELS: Record<'pt' | 'en' | 'fr' | 'es', string> = {
  pt: 'Portugues (pt-PT)',
  en: 'English (en-US)',
  fr: 'Francais (fr-FR)',
  es: 'Espanol (es-ES)',
};
