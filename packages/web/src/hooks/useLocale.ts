/**
 * useLocale — hook para gerir o locale do i18n + store.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import type { Locale } from '@carsai/shared';

export function useLocale() {
  const { i18n, t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const setLocaleStore = useUIStore((s) => s.setLocale);

  const setLocale = useCallback(
    async (l: Locale) => {
      setLocaleStore(l);
      try {
        await i18n.changeLanguage(l);
        document.documentElement.lang = l;
      } catch {
        /* ignore */
      }
    },
    [i18n, setLocaleStore],
  );

  return { locale, setLocale, t };
}

export default useLocale;
