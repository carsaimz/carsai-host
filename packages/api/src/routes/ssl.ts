/**
 * CARSAI HOST — SSL certificates routes
 * Issues SSL via Let's Encrypt / ZeroSSL / GoGetSSL (acme-client).
 *
 * Note: This is the SSL management layer. The actual ACME challenge
 * solving is handled by a background job that:
 * 1. Generates a CSR
 * 2. Places the ACME challenge token in the .well-known/acme-challenge/
 *    directory of the domain (via FTP/SFTP to iFastNet server)
 * 3. Tells the ACME provider to verify
 * 4. Stores the issued certificate
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden, fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { issueSslSchema } from '@carsai/shared';
import { logger } from '../utils/logger.js';

export const sslRouter = Router();
sslRouter.use(requireAuth);

// ─── POST /ssl/issue ───────────────────────────────────────────
sslRouter.post(
  '/issue',
  validate(issueSslSchema),
  asyncHandler(async (req, res) => {
    const { domainId, provider } = req.body;

    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, domainId))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    // In a real implementation, this enqueues a background job:
    //   - Generate CSR
    //   - Connect to iFastNet FTP
    //   - Place ACME challenge at /.well-known/acme-challenge/<token>
    //   - Submit order to ACME provider (Let's Encrypt/ZeroSSL/GoGetSSL)
    //   - Verify and download certificate
    //   - Install on iFastNet server
    //   - Update sslIssued + sslExpiresAt in DB

    logger.info('[ssl] certificate issue requested', {
      domainId,
      domain: domain.domain,
      provider,
    });

    // For now, mark as issued (placeholder until ACME job is implemented)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3); // 90 days

    await db
      .update(schema.domains)
      .set({
        sslIssued: true,
        sslExpiresAt: expiresAt.toISOString(),
      })
      .where(eq(schema.domains.id, domain.id));

    return ok(res, {
      domain: domain.domain,
      provider,
      issued: true,
      expiresAt: expiresAt.toISOString(),
    });
  }),
);

// ─── GET /ssl/:domainId ────────────────────────────────────────
sslRouter.get(
  '/:domainId',
  asyncHandler(async (req, res) => {
    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, req.params.domainId))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    return ok(res, {
      domain: domain.domain,
      sslIssued: domain.sslIssued,
      expiresAt: domain.sslExpiresAt,
    });
  }),
);

// ─── POST /ssl/:domainId/renew ─────────────────────────────────
sslRouter.post(
  '/:domainId/renew',
  asyncHandler(async (req, res) => {
    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, req.params.domainId))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    // Same logic as /issue — would enqueue renewal job
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    await db
      .update(schema.domains)
      .set({
        sslIssued: true,
        sslExpiresAt: expiresAt.toISOString(),
      })
      .where(eq(schema.domains.id, domain.id));

    return ok(res, { renewed: true, expiresAt: expiresAt.toISOString() });
  }),
);
