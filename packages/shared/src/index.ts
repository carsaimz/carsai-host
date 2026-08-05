/**
 * CARSAI HOST — Shared package entry point
 * Re-exporta tudo o que é partilhado entre frontend, backend e mobile.
 *
 * Nota: SUPPORTED_LOCALES e DEFAULT_LOCALE existem tanto em constants como
 * em i18n (intencional, para conveniencia local). Aqui re-exportamos apenas
 * de constants para evitar conflito de namespaces (TS2308 / Rollup).
 */
export * from './types/index.js';
export * from './constants/index.js';
export * from './schemas/index.js';
export {
  translations,
  getTranslation,
  translate,
  type TranslationKey,
} from './i18n/index.js';
