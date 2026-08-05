import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUIStore } from '@/store/uiStore';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@carsai/shared';
import { cn } from '@/lib/utils';

/** LanguageSwitcher — dropdown com bandeiras para PT/EN/FR/ES. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  const current = LOCALE_LABELS[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon' : 'sm'} className="gap-2">
          <Globe className="h-4 w-4" />
          {!compact && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="text-base leading-none">
                {current?.flag}
              </span>
              <span className="hidden sm:inline">{current?.label}</span>
            </span>
          )}
          {compact && (
            <span aria-hidden className="text-base leading-none">
              {current?.flag}
            </span>
          )}
          <span className="sr-only">{t('language.selector')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>{t('language.selector')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LOCALES.map((l) => {
          const info = LOCALE_LABELS[l];
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => setLocale(l as Locale)}
              className={cn(locale === l && 'bg-secondary')}
            >
              <span aria-hidden className="text-base">
                {info.flag}
              </span>
              <span>{info.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
