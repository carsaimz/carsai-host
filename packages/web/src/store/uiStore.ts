/**
 * CARSAI HOST — UI store (Zusand)
 * Estado de UI global: tema, sidebar colapsada, locale.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_LOCALE } from '@carsai/shared';

type Theme = 'dark' | 'light';
type Locale = 'pt' | 'en' | 'fr' | 'es';

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  locale: Locale;

  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setLocale: (l: Locale) => void;
}

const THEME_KEY = 'carsai.theme';
const LOCALE_KEY = 'carsai.locale';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  // Default: dark (Xera-inspired)
  return 'dark';
}

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored === 'pt' || stored === 'en' || stored === 'fr' || stored === 'es') return stored;
  return DEFAULT_LOCALE;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: readInitialTheme(),
      sidebarCollapsed: false,
      locale: readInitialLocale(),

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setLocale: (l) => {
        try {
          localStorage.setItem(LOCALE_KEY, l);
        } catch {
          /* ignore */
        }
        set({ locale: l });
      },
    }),
    {
      name: 'carsai.ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, locale: s.locale, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

/** Aplica a classe `dark` no <html> conforme o tema. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = theme;
}

// Aplica tema inicial ao carregar o modulo
if (typeof window !== 'undefined') {
  applyTheme(readInitialTheme());
}
