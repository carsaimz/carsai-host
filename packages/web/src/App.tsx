import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';
import { router } from '@/app/router';
import { initI18n } from '@/i18n/config';
import { useAuthStore } from '@/store/authStore';
import { useUIStore, applyTheme } from '@/store/uiStore';
import { useLocale } from '@/hooks/useLocale';

// Inicializa o i18n antes do render
initI18n();

// Query client com defaults sane
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useLocale().setLocale;

  // Aplica tema inicial
  useEffect(() => {
    applyTheme(useUIStore.getState().theme);
  }, []);

  // Sincroniza locale inicial com i18n
  useEffect(() => {
    void setLocale(locale);
  }, [locale, setLocale]);

  // Tenta restaurar sessao ao montar
  useEffect(() => {
    const token = localStorage.getItem('carsai.accessToken');
    if (token) void fetchMe();
  }, [fetchMe]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
