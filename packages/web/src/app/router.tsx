import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PublicOnly, Protected, AdminOnly } from './guards';
import { ROUTES } from '@carsai/shared';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';

// ─── Lazy-loaded pages ─────────────────────────────────────────
const HomePage = lazy(() => import('@/pages/public/HomePage').then((m) => ({ default: m.HomePage })));
const FeaturesPage = lazy(() => import('@/pages/public/FeaturesPage').then((m) => ({ default: m.FeaturesPage })));
const AboutPage = lazy(() => import('@/pages/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const BlogPage = lazy(() => import('@/pages/public/BlogPage').then((m) => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() => import('@/pages/public/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));
const ForumPage = lazy(() => import('@/pages/public/ForumPage').then((m) => ({ default: m.ForumPage })));
const ForumTopicPage = lazy(() => import('@/pages/public/ForumTopicPage').then((m) => ({ default: m.ForumTopicPage })));
const ContactPage = lazy(() => import('@/pages/public/ContactPage').then((m) => ({ default: m.ContactPage })));
const LoginPage = lazy(() => import('@/pages/public/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const TermsPage = lazy(() => import('@/pages/public/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Dashboard
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const AccountsPage = lazy(() => import('@/pages/dashboard/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const CreateAccountPage = lazy(() => import('@/pages/dashboard/CreateAccountPage').then((m) => ({ default: m.CreateAccountPage })));
const AccountDetailsPage = lazy(() => import('@/pages/dashboard/AccountDetailsPage').then((m) => ({ default: m.AccountDetailsPage })));
const FilesPage = lazy(() => import('@/pages/dashboard/FilesPage').then((m) => ({ default: m.FilesPage })));
const DatabasesPage = lazy(() => import('@/pages/dashboard/DatabasesPage').then((m) => ({ default: m.DatabasesPage })));
const DomainsPage = lazy(() => import('@/pages/dashboard/DomainsPage').then((m) => ({ default: m.DomainsPage })));
const SslPage = lazy(() => import('@/pages/dashboard/SslPage').then((m) => ({ default: m.SslPage })));
const BackupsPage = lazy(() => import('@/pages/dashboard/BackupsPage').then((m) => ({ default: m.BackupsPage })));
const CronPage = lazy(() => import('@/pages/dashboard/CronPage').then((m) => ({ default: m.CronPage })));
const TicketsPage = lazy(() => import('@/pages/dashboard/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const TicketDetailPage = lazy(() => import('@/pages/dashboard/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })));
const CreateTicketPage = lazy(() => import('@/pages/dashboard/CreateTicketPage').then((m) => ({ default: m.CreateTicketPage })));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ApiTokensPage = lazy(() => import('@/pages/dashboard/ApiTokensPage').then((m) => ({ default: m.ApiTokensPage })));

// Admin
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminAccountsPage = lazy(() => import('@/pages/admin/AdminAccountsPage').then((m) => ({ default: m.AdminAccountsPage })));
const AdminTicketsPage = lazy(() => import('@/pages/admin/AdminTicketsPage').then((m) => ({ default: m.AdminTicketsPage })));
const AdminBlogPage = lazy(() => import('@/pages/admin/AdminBlogPage').then((m) => ({ default: m.AdminBlogPage })));
const AdminForumPage = lazy(() => import('@/pages/admin/AdminForumPage').then((m) => ({ default: m.AdminForumPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<FullScreenLoader />}>{node}</Suspense>;

// ─── Routes ────────────────────────────────────────────────────
const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.HOME, element: withSuspense(<HomePage />) },
      { path: ROUTES.FEATURES, element: withSuspense(<FeaturesPage />) },
      { path: ROUTES.ABOUT, element: withSuspense(<AboutPage />) },
      { path: ROUTES.BLOG, element: withSuspense(<BlogPage />) },
      { path: `${ROUTES.BLOG}/:slug`, element: withSuspense(<BlogPostPage />) },
      { path: ROUTES.FORUM, element: withSuspense(<ForumPage />) },
      { path: `${ROUTES.FORUM}/:slug`, element: withSuspense(<ForumTopicPage />) },
      { path: ROUTES.CONTACT, element: withSuspense(<ContactPage />) },
      { path: ROUTES.TERMS, element: withSuspense(<TermsPage />) },
      { path: ROUTES.PRIVACY, element: withSuspense(<PrivacyPage />) },
    ],
  },
  // Auth pages (no layout)
  {
    path: ROUTES.LOGIN,
    element: withSuspense(<PublicOnly><LoginPage /></PublicOnly>),
  },
  {
    path: `${ROUTES.LOGIN}/forgot`,
    element: withSuspense(<PublicOnly><ForgotPasswordPage /></PublicOnly>),
  },
  {
    path: '/reset-password',
    element: withSuspense(<PublicOnly><ResetPasswordPage /></PublicOnly>),
  },
  {
    path: '/verify-email',
    element: withSuspense(<PublicOnly><VerifyEmailPage /></PublicOnly>),
  },
  {
    path: ROUTES.REGISTER,
    element: withSuspense(<PublicOnly><RegisterPage /></PublicOnly>),
  },
  // Dashboard (protected)
  {
    path: ROUTES.DASHBOARD,
    element: (
      <Protected>
        <DashboardLayout />
      </Protected>
    ),
    children: [
      { index: true, element: withSuspense(<OverviewPage />) },
      { path: 'accounts', element: withSuspense(<AccountsPage />) },
      { path: 'accounts/create', element: withSuspense(<CreateAccountPage />) },
      { path: 'accounts/:id', element: withSuspense(<AccountDetailsPage />) },
      { path: 'files', element: withSuspense(<FilesPage />) },
      { path: 'databases', element: withSuspense(<DatabasesPage />) },
      { path: 'domains', element: withSuspense(<DomainsPage />) },
      { path: 'ssl', element: withSuspense(<SslPage />) },
      { path: 'backups', element: withSuspense(<BackupsPage />) },
      { path: 'cron', element: withSuspense(<CronPage />) },
      { path: 'tickets', element: withSuspense(<TicketsPage />) },
      { path: 'tickets/create', element: withSuspense(<CreateTicketPage />) },
      { path: 'tickets/:id', element: withSuspense(<TicketDetailPage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
      { path: 'profile', element: withSuspense(<ProfilePage />) },
      { path: 'api', element: withSuspense(<ApiTokensPage />) },
    ],
  },
  // Admin (admin only)
  {
    path: ROUTES.ADMIN,
    element: (
      <AdminOnly>
        <AdminLayout />
      </AdminOnly>
    ),
    children: [
      { index: true, element: withSuspense(<AdminDashboardPage />) },
      { path: 'users', element: withSuspense(<AdminUsersPage />) },
      { path: 'accounts', element: withSuspense(<AdminAccountsPage />) },
      { path: 'tickets', element: withSuspense(<AdminTicketsPage />) },
      { path: 'blog', element: withSuspense(<AdminBlogPage />) },
      { path: 'forum', element: withSuspense(<AdminForumPage />) },
      { path: 'settings', element: withSuspense(<AdminSettingsPage />) },
    ],
  },
  // 404
  { path: '*', element: withSuspense(<NotFoundPage />) },
];

export const router = createBrowserRouter(routes);
export default router;
