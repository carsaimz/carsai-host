import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';

/** ThemeToggle — alterna entre dark e light (default: dark). */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('common.theme.light') ?? 'Light mode' : t('common.theme.dark') ?? 'Dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export default ThemeToggle;
