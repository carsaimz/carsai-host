/**
 * CARSAI HOST — Domains routes (add, list, DNS records)
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden, fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addDomainSchema, dnsRecordSchema } from '@carsai/shared';

export const domainsRouter = Router();
domainsRouter.use(requireAuth);

// ─── GET /domains ──────────────────────────────────────────────
domainsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.userId, req.user!.id));
    return ok(res, rows);
  }),
);

// ─── POST /domains ─────────────────────────────────────────────
domainsRouter.post(
  '/',
  validate(addDomainSchema),
  asyncHandler(async (req, res) => {
    const { accountId, domain, type } = req.body;

    // Verify account ownership
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
    await db.insert(schema.domains).values({
      id,
      accountId,
      userId: req.user!.id,
      domain,
      type,
      status: 'pending',
      sslIssued: false,
      createdAt: now,
    });

    return ok(res, { id, domain, type, status: 'pending' }, 201);
  }),
);

// ─── GET /domains/:id/dns ──────────────────────────────────────
domainsRouter.get(
  '/:id/dns',
  asyncHandler(async (req, res) => {
    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, req.params.id))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    const records = await db
      .select()
      .from(schema.dnsRecords)
      .where(eq(schema.dnsRecords.domainId, domain.id));
    return ok(res, records);
  }),
);

// ─── POST /domains/:id/dns ─────────────────────────────────────
domainsRouter.post(
  '/:id/dns',
  validate(dnsRecordSchema),
  asyncHandler(async (req, res) => {
    const { type, name, value, ttl, priority } = req.body;
    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, req.params.id))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    const id = uuidv4();
    await db.insert(schema.dnsRecords).values({
      id,
      domainId: domain.id,
      type,
      name,
      value,
      ttl,
      priority: priority ?? null,
      createdAt: new Date().toISOString(),
    });

    return ok(res, { id, type, name, value, ttl, priority }, 201);
  }),
);

// ─── DELETE /domains/:id/dns/:recordId ─────────────────────────
domainsRouter.delete(
  '/:id/dns/:recordId',
  asyncHandler(async (req, res) => {
    const domainRow = await db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.id, req.params.id))
      .limit(1);
    const domain = domainRow[0];
    if (!domain) return notFound(res, 'Domain not found');
    if (domain.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    await db
      .delete(schema.dnsRecords)
      .where(
        and(
          eq(schema.dnsRecords.id, req.params.recordId),
          eq(schema.dnsRecords.domainId, domain.id),
        ),
      );
    return ok(res, { deleted: true });
  }),
);
