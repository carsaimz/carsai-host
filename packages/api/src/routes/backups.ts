/**
 * CARSAI HOST — Backups routes
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden, fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const backupsRouter = Router();
backupsRouter.use(requireAuth);

// ─── GET /backups?accountId=... ────────────────────────────────
backupsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { accountId } = req.query;
    const rows = await db
      .select()
      .from(schema.backups)
      .where(
        accountId
          ? eq(schema.backups.accountId, accountId as string)
          : eq(schema.backups.userId, req.user!.id),
      )
      .orderBy(desc(schema.backups.createdAt));
    return ok(res, rows);
  }),
);

// ─── POST /backups ─────────────────────────────────────────────
backupsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { accountId, provider = 'local' } = req.body;
    if (!accountId) return fail(res, 'ACCOUNT_REQUIRED', 'accountId required', 400);

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
    const filename = `backup-${account.username}-${Date.now()}.tar.gz`;
    const now = new Date().toISOString();

    await db.insert(schema.backups).values({
      id,
      accountId,
      userId: req.user!.id,
      provider,
      filename,
      sizeMb: 0,
      status: 'pending',
      createdAt: now,
    });

    // In production, enqueue backup job:
    //   - Connect to iFastNet FTP
    //   - Tar.gz the htdocs directory
    //   - Upload to provider (local/gdrive/dropbox)
    //   - Update sizeMb + status=completed + url

    logger.info('[backups] backup requested', { backupId: id, accountId, provider });

    return ok(res, { id, filename, status: 'pending', provider }, 201);
  }),
);

// ─── DELETE /backups/:id ───────────────────────────────────────
backupsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const backupRow = await db
      .select()
      .from(schema.backups)
      .where(eq(schema.backups.id, req.params.id))
      .limit(1);
    const backup = backupRow[0];
    if (!backup) return notFound(res, 'Backup not found');
    if (backup.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    await db.delete(schema.backups).where(eq(schema.backups.id, backup.id));
    return ok(res, { deleted: true });
  }),
);
