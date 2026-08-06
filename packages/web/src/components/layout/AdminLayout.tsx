import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Users,
  Server,
  LifeBuoy,
  FileText,
  MessagesSquare,
  Settings,
  Cpu,
  Menu,
  LogOut,
  ChevronLeft,
  LayoutDashboard,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { ROUTES } from '@carsai/shared';
import { cn, getInitials } from '@/lib/utils';

/** AdminLayout — sidebar admin + topbar + main. */
export function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: ROUTES.ADMIN, icon: LayoutDashboard, label: t('dashboard.overview'), end: true },
    { to: ROUTES.ADMIN_USERS, icon: Users, label: t('admin.users') },
    { to: ROUTES.ADMIN_ACCOUNTS, icon: Server, label: t('admin.accounts') },
    { to: ROUTES.ADMIN_TICKETS, icon: LifeBuoy, label: t('admin.tickets') },
    { to: ROUTES.ADMIN_BLOG, icon: FileText, label: t('admin.blog') },
    { to: ROUTES.ADMIN_FORUM, icon: MessagesSquare, label: t('admin.forum') },
    { to: ROUTES.ADMIN_SETTINGS, icon: Settings, label: t('admin.settings') },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const userLabel = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username : '';
  const initials = getInitials(userLabel || user?.email);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/40 transition-all lg:flex',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border bg-destructive/10 px-4">
          <Link to={ROUTES.ADMIN} className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="flex flex-col leading-tight">
                <span className="text-sm">CARSAI ADMIN</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Painel administrativo</span>
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn('sidebar-link', isActive && 'sidebar-link-active', collapsed && 'justify-center px-2')
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button onClick={toggleSidebar} className="sidebar-link w-full">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* Offcanvas mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
          <SheetHeader className="bg-destructive/10">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm">CARSAI ADMIN</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Painel administrativo
                </span>
              </span>
            </SheetTitle>
            <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          </SheetHeader>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2" onClick={() => setMobileOpen(false)}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={ROUTES.DASHBOARD}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Voltar ao dashboard
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('admin.title')}</h1>
            <span className="hidden items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive sm:inline-flex">
              <Cpu className="h-3 w-3" /> Admin
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageSwitcher compact />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-secondary">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} alt={userLabel} />
                    <AvatarFallback className="bg-destructive/20 text-destructive">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium leading-tight">{userLabel || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.DASHBOARD}>
                    <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
