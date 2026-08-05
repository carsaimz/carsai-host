/**
 * CARSAI HOST — Admin routes (with server statistics — authenticated area)
 *
 * Estatísticas de servidor só disponíveis para admins.
 */
import { Router } from 'express';
import { count, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, fail } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import os from 'node:os';
import process from 'node:process';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// ─── GET /admin/stats ──────────────────────────────────────────
// Estatísticas completas — apenas admin.
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [usersCount] = await db.select({ c: count() }).from(schema.users);
    const [accountsCount] = await db.select({ c: count() }).from(schema.hostingAccounts);
    const [activeAccounts] = await db
      .select({ c: count() })
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.status, 'active'));
    const [suspendedAccounts] = await db
      .select({ c: count() })
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.status, 'suspended'));
    const [openTickets] = await db
      .select({ c: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'open'));
    const [postsCount] = await db.select({ c: count() }).from(schema.blogPosts);
    const [topicsCount] = await db.select({ c: count() }).from(schema.forumTopics);

    // System stats (server-level) — only here, in authenticated admin area
    const mem = process.memoryUsage();
    const systemStats = {
      platform: process.platform,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      cpuCores: os.cpus().length,
      loadAvg: os.loadavg(),
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
    };

    return ok(res, {
      users: usersCount?.c ?? 0,
      accounts: accountsCount?.c ?? 0,
      activeAccounts: activeAccounts?.c ?? 0,
      suspendedAccounts: suspendedAccounts?.c ?? 0,
      openTickets: openTickets?.c ?? 0,
      blogPosts: postsCount?.c ?? 0,
      forumTopics: topicsCount?.c ?? 0,
      system: systemStats,
    });
  }),
);

// ─── GET /admin/users ──────────────────────────────────────────
adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { limit = '50', page = '1' } = req.query;
    const lim = Math.min(parseInt(limit as string, 10) || 50, 200);
    const off = (parseInt(page as string, 10) || 1 - 1) * lim;

    const users = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        status: schema.users.status,
        emailVerifiedAt: schema.users.emailVerifiedAt,
        twoFactorEnabled: schema.users.twoFactorEnabled,
        locale: schema.users.locale,
        createdAt: schema.users.createdAt,
        lastLoginAt: schema.users.lastLoginAt,
      })
      .from(schema.users)
      .orderBy(schema.users.createdAt)
      .limit(lim)
      .offset(Math.max(0, off));

    return ok(res, users);
  }),
);

// ─── POST /admin/users/:id/suspend ─────────────────────────────
adminRouter.post(
  '/users/:id/suspend',
  asyncHandler(async (req, res) => {
    await db
      .update(schema.users)
      .set({ status: 'suspended', updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, req.params.id));
    return ok(res, { suspended: true });
  }),
);

// ─── POST /admin/users/:id/activate ────────────────────────────
adminRouter.post(
  '/users/:id/activate',
  asyncHandler(async (req, res) => {
    await db
      .update(schema.users)
      .set({ status: 'active', updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, req.params.id));
    return ok(res, { activated: true });
  }),
);

// ─── POST /admin/users/:id/role ────────────────────────────────
adminRouter.post(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return fail(res, 'INVALID_ROLE', 'Invalid role', 400);
    }
    await db
      .update(schema.users)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, req.params.id));
    return ok(res, { updated: true });
  }),
);
