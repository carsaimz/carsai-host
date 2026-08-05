/**
 * CARSAI HOST — i18next initialization
 * Carrega as traducoes do pacote @carsai/shared/i18n.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@carsai/shared';

export const locales = SUPPORTED_LOCALES;
export const defaultLocale = DEFAULT_LOCALE;

// Normaliza as traducoes para o formato do i18next (com namespace "translation")
const resources = Object.fromEntries(
  Object.entries(translations).map(([lng, dict]) => [lng, { translation: dict }]),
);

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: defaultLocale,
      lng: defaultLocale,
      supportedLngs: [...locales],
      interpolation: {
        escapeValue: false, // React ja escapa
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'carsai.locale',
        caches: ['localStorage'],
      },
      returnEmptyString: false,
    });

  return i18n;
}

export default i18n;
