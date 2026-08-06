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
import {
  getAllForAdmin,
  setMany,
  invalidateSettingsCache,
  SETTING_DEFS,
} from '../services/settings.js';
import { mofhClient } from '../services/mofh-client.js';
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

// ─── GET /admin/settings ───────────────────────────────────────
// Returns all settings grouped by category. Secrets are masked.
adminRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const { byCategory } = await getAllForAdmin();
    return ok(res, {
      byCategory,
      categories: ['general', 'mofh', 'smtp', 'oauth', 'storage', 'ssl'],
    });
  }),
);

// ─── PUT /admin/settings ───────────────────────────────────────
// Accepts a flat { key: value } object. Only known keys are accepted.
// Unknown keys are silently dropped. Secrets that arrive as the
// masked placeholder '••••••••' are no-ops (preserves the stored value).
adminRouter.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const input = (req.body ?? {}) as Record<string, string>;
    const knownKeys = new Set(SETTING_DEFS.map((d) => d.key));
    const accepted: Record<string, string> = {};
    const rejected: string[] = [];
    for (const [k, v] of Object.entries(input)) {
      if (knownKeys.has(k)) {
        accepted[k] = typeof v === 'string' ? v : String(v);
      } else {
        rejected.push(k);
      }
    }
    await setMany(accepted);
    return ok(res, {
      updated: Object.keys(accepted).length,
      rejected,
    });
  }),
);

// ─── POST /admin/settings/test-mofh ────────────────────────────
// Tests the MOFH credentials currently stored in the DB. Useful after
// updating credentials to verify they work before relying on them.
adminRouter.post(
  '/settings/test-mofh',
  asyncHandler(async (_req, res) => {
    const result = await mofhClient.checkDomainAvailability('example.com');
    return ok(res, {
      connected: result.available !== undefined,
      message: result.message,
    });
  }),
);

// ─── POST /admin/settings/test-smtp ────────────────────────────
// Sends a test email to the admin's own address to verify SMTP config.
adminRouter.post(
  '/settings/test-smtp',
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const targetEmail = (req.body?.to as string) || user?.email;
    if (!targetEmail) {
      return fail(res, 'NO_RECIPIENT', 'Provide a recipient email in { to }', 400);
    }
    const { sendEmail } = await import('../services/email.js');
    try {
      await sendEmail({
        to: targetEmail,
        subject: '[CARSAI HOST] SMTP test',
        text: 'This is a test email from CARSAI HOST. If you received it, SMTP is working.',
        html: '<p>This is a test email from <strong>CARSAI HOST</strong>. If you received it, SMTP is working.</p>',
      });
      return ok(res, { sent: true, to: targetEmail });
    } catch (err) {
      return fail(
        res,
        'SMTP_TEST_FAILED',
        err instanceof Error ? err.message : String(err),
        500,
      );
    }
  }),
);

// ─── POST /admin/settings/invalidate-cache ─────────────────────
// Manual cache invalidation (rarely needed; writes already invalidate).
adminRouter.post(
  '/settings/invalidate-cache',
  asyncHandler(async (_req, res) => {
    invalidateSettingsCache();
    return ok(res, { invalidated: true });
  }),
);
