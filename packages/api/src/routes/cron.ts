/**
 * CARSAI HOST — Cron jobs routes
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCronJobSchema } from '@carsai/shared';

export const cronRouter = Router();
cronRouter.use(requireAuth);

// ─── GET /cron?accountId=... ───────────────────────────────────
cronRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { accountId } = req.query;
    const rows = await db
      .select()
      .from(schema.cronJobs)
      .where(eq(schema.cronJobs.userId, req.user!.id))
      .orderBy(desc(schema.cronJobs.createdAt));
    const filtered = accountId
      ? rows.filter((r) => r.accountId === accountId)
      : rows;
    return ok(res, filtered);
  }),
);

// ─── POST /cron ────────────────────────────────────────────────
cronRouter.post(
  '/',
  validate(createCronJobSchema),
  asyncHandler(async (req, res) => {
    const { accountId, name, command, schedule } = req.body;

    const accountRow = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.id, accountId))
      .limit(1);
    const account = accountRow[0];
    if (!account) return notFound(res, 'Account not found');
    if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    await db.insert(schema.cronJobs).values({
      id,
      accountId,
      userId: req.user!.id,
      name,
      command,
      schedule,
      active: true,
      createdAt: now,
    });

    // In production, sync with iFastNet cron API or crontab

    return ok(res, { id, name, command, schedule, active: true }, 201);
  }),
);

// ─── PUT /cron/:id ─────────────────────────────────────────────
cronRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, command, schedule, active } = req.body;
    const jobRow = await db
      .select()
      .from(schema.cronJobs)
      .where(eq(schema.cronJobs.id, req.params.id))
      .limit(1);
    const job = jobRow[0];
    if (!job) return notFound(res, 'Cron job not found');
    if (job.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    await db
      .update(schema.cronJobs)
      .set({
        ...(name !== undefined && { name }),
        ...(command !== undefined && { command }),
        ...(schedule !== undefined && { schedule }),
        ...(active !== undefined && { active }),
      })
      .where(eq(schema.cronJobs.id, job.id));

    return ok(res, { updated: true });
  }),
);

// ─── DELETE /cron/:id ──────────────────────────────────────────
cronRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const jobRow = await db
      .select()
      .from(schema.cronJobs)
      .where(eq(schema.cronJobs.id, req.params.id))
      .limit(1);
    const job = jobRow[0];
    if (!job) return notFound(res, 'Cron job not found');
    if (job.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    await db.delete(schema.cronJobs).where(eq(schema.cronJobs.id, job.id));
    return ok(res, { deleted: true });
  }),
);
