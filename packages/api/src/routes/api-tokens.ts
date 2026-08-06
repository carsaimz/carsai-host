/**
 * CARSAI HOST — API tokens routes (developer API)
 * Personal access tokens for programmatic API access.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createApiTokenSchema } from '@carsai/shared';
import { generateRandomToken } from '../utils/auth.js';

export const apiTokensRouter = Router();
apiTokensRouter.use(requireAuth);

// ─── GET /api-tokens ───────────────────────────────────────────
apiTokensRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({
        id: schema.apiTokens.id,
        name: schema.apiTokens.name,
        scopes: schema.apiTokens.scopes,
        lastUsedAt: schema.apiTokens.lastUsedAt,
        expiresAt: schema.apiTokens.expiresAt,
        createdAt: schema.apiTokens.createdAt,
      })
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.userId, req.user!.id))
      .orderBy(desc(schema.apiTokens.createdAt));
    return ok(res, rows);
  }),
);

// ─── POST /api-tokens ──────────────────────────────────────────
apiTokensRouter.post(
  '/',
  validate(createApiTokenSchema),
  asyncHandler(async (req, res) => {
    const { name, scopes } = req.body;
    const id = uuidv4();
    // Generate a token like: chs_live_<random>
    const rawToken = `chs_live_${generateRandomToken(32)}`;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await db.insert(schema.apiTokens).values({
      id,
      userId: req.user!.id,
      name,
      tokenHash,
      scopes: JSON.stringify(scopes || []),
      createdAt: new Date().toISOString(),
    });

    // Return raw token ONCE — only the hash is stored
    return ok(res, { id, name, token: rawToken, scopes: scopes || [] }, 201);
  }),
);

// ─── DELETE /api-tokens/:id ────────────────────────────────────
apiTokensRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await db
      .delete(schema.apiTokens)
      .where(eq(schema.apiTokens.id, req.params.id));
    return ok(res, { deleted: true });
  }),
);
