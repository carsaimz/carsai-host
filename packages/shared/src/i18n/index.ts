/**
 * CARSAI HOST — i18n loader (shared)
 * Carrega todas as traduções e exporta um helper para aceder a qualquer locale.
 */
import pt from './pt.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };

export const translations = { pt, en, fr, es } as const;

export type TranslationKey = keyof typeof pt;

export function getTranslation(locale: string): typeof pt {
  return (translations as Record<string, typeof pt>)[locale] ?? translations.pt;
}

/**
 * Resolve uma chave aninhada (ex: "auth.login.title") num objecto de tradução.
 * Suporta interpolação com {{var}}.
 */
export function translate(
  locale: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = getTranslation(locale);
  const parts = key.split('.');
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key; // fallback: devolve a própria chave
    }
  }
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`,
  );
}

export const SUPPORTED_LOCALES = ['pt', 'en', 'fr', 'es'] as const;
export const DEFAULT_LOCALE = 'pt' as const;
