/**
 * CARSAI HOST — Notifications routes
 */
import { Router } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// ─── GET /notifications ────────────────────────────────────────
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, req.user!.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
    return ok(res, rows);
  }),
);

// ─── GET /notifications/unread-count ───────────────────────────
notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, req.user!.id),
          eq(schema.notifications.read, false),
        ),
      );
    return ok(res, { count: rows.length });
  }),
);

// ─── POST /notifications/:id/read ──────────────────────────────
notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, req.params.id));
    return ok(res, { read: true });
  }),
);

// ─── POST /notifications/read-all ──────────────────────────────
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, req.user!.id));
    return ok(res, { updated: true });
  }),
);
