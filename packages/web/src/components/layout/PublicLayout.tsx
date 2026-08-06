import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Menu,
  Shield,
  FileText,
  LifeBuoy,
  Globe,
  Mail,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ROUTES } from '@carsai/shared';

/** PublicLayout — header com nav + main + footer (sem stats de servidor). */
export function PublicLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: ROUTES.HOME, label: t('nav.home') },
    { to: ROUTES.FEATURES, label: t('nav.features') },
    { to: ROUTES.ABOUT, label: t('nav.about') },
    { to: ROUTES.BLOG, label: t('nav.blog') },
    { to: ROUTES.FORUM, label: t('nav.forum') },
    { to: ROUTES.CONTACT, label: t('nav.contact') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
              <Server className="h-5 w-5" />
            </span>
            <span className="text-lg">CARSAI HOST</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.HOME}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to={ROUTES.LOGIN}>
                  <LogIn className="h-4 w-4" />
                  {t('nav.login')}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to={ROUTES.REGISTER}>
                  <UserPlus className="h-4 w-4" />
                  {t('nav.register')}
                </Link>
              </Button>
            </div>

            {/* Mobile menu toggle — opens the offcanvas Sheet */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Offcanvas mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-3/4 max-w-xs p-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Server className="h-4 w-4" />
              </span>
              CARSAI HOST
            </SheetTitle>
            <SheetDescription className="sr-only">Menu de navegação</SheetDescription>
          </SheetHeader>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.HOME}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary',
                    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to={ROUTES.LOGIN} onClick={() => setMobileOpen(false)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('nav.login')}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start">
                <Link to={ROUTES.REGISTER} onClick={() => setMobileOpen(false)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('nav.register')}
                </Link>
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40">
        <div className="container grid gap-8 py-10 md:grid-cols-4">
          <div className="space-y-3">
            <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Server className="h-4 w-4" />
              </span>
              CARSAI HOST
            </Link>
            <p className="text-sm text-muted-foreground">{t('common.tagline')}</p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('footer.product')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to={ROUTES.FEATURES} className="hover:text-foreground">{t('nav.features')}</Link></li>
              <li><Link to={ROUTES.BLOG} className="hover:text-foreground">{t('nav.blog')}</Link></li>
              <li><Link to={ROUTES.FORUM} className="hover:text-foreground">{t('nav.forum')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to={ROUTES.TERMS} className="hover:text-foreground">{t('footer.terms')}</Link></li>
              <li><Link to={ROUTES.PRIVACY} className="hover:text-foreground">{t('footer.privacy')}</Link></li>
              <li><Link to={ROUTES.CONTACT} className="hover:text-foreground">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('footer.community')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> Suporte 24/7</li>
              <li className="flex items-center gap-2"><Globe className="h-4 w-4" /> iFastNet (Byet)</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> SSL gratuito</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
            <p>(c) {new Date().getFullYear()} CARSAI HOST. {t('footer.rights')}.</p>
            <p className="flex items-center gap-1">
              {t('footer.madeWith')} <FileText className="h-3 w-3" /> <Mail className="h-3 w-3" /> &amp; iFastNet
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
