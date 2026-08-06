/**
 * CARSAI HOST — Webhooks routes (developer API)
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createWebhookSchema } from '@carsai/shared';
import { generateRandomToken } from '../utils/auth.js';

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);

// ─── GET /webhooks ─────────────────────────────────────────────
webhooksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({
        id: schema.webhooks.id,
        url: schema.webhooks.url,
        events: schema.webhooks.events,
        active: schema.webhooks.active,
        lastTriggeredAt: schema.webhooks.lastTriggeredAt,
        createdAt: schema.webhooks.createdAt,
      })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.userId, req.user!.id))
      .orderBy(desc(schema.webhooks.createdAt));
    return ok(res, rows);
  }),
);

// ─── POST /webhooks ────────────────────────────────────────────
webhooksRouter.post(
  '/',
  validate(createWebhookSchema),
  asyncHandler(async (req, res) => {
    const { url, events, active } = req.body;
    const id = uuidv4();
    const secret = generateRandomToken(24);

    await db.insert(schema.webhooks).values({
      id,
      userId: req.user!.id,
      url,
      events: JSON.stringify(events),
      secret,
      active: active ?? true,
      createdAt: new Date().toISOString(),
    });

    return ok(res, { id, url, events, secret, active: active ?? true }, 201);
  }),
);

// ─── DELETE /webhooks/:id ──────────────────────────────────────
webhooksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await db
      .delete(schema.webhooks)
      .where(eq(schema.webhooks.id, req.params.id));
    return ok(res, { deleted: true });
  }),
);
