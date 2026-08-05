/**
 * CARSAI HOST — Hosting accounts routes (MOFH integration)
 * Create, list, suspend, unsuspend, reset password
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { mofhClient } from '../services/mofh-client.js';
import { encrypt, decrypt } from '../utils/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden, fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { createAccountSchema, suspendAccountSchema } from '@carsai/shared';

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

// ─── GET /accounts ─────────────────────────────────────────────
accountsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.userId, req.user!.id));

    // Don't return encrypted password
    const sanitized = rows.map((r) => ({
      ...r,
      passwordEncrypted: undefined,
    }));
    return ok(res, sanitized);
  }),
);

// ─── POST /accounts ────────────────────────────────────────────
accountsRouter.post(
  '/',
  validate(createAccountSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { domain, subdomain, customDomain, package: pkg } = req.body;

    // Compor domínio final
    let fullDomain: string;
    if (customDomain) {
      fullDomain = customDomain;
    } else if (subdomain) {
      fullDomain = `${subdomain}.${env.mofh.defaultDomain}`;
    } else {
      // Usar domain + defaultDomain
      fullDomain = `${domain}.${env.mofh.defaultDomain}`;
    }

    // Verificar se já existe conta para este domínio
    const existing = await db
      .select()
      .from(schema.hostingAccounts)
      .where(
        and(
          eq(schema.hostingAccounts.domain, fullDomain),
          eq(schema.hostingAccounts.userId, userId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return fail(res, 'DOMAIN_TAKEN', 'Domain already used', 409);
    }

    // Chamar MOFH API para criar a conta REAL
    if (!mofhClient.isConfigured()) {
      return fail(
        res,
        'MOFH_NOT_CONFIGURED',
        'Hosting provider not configured. Contact admin.',
        503,
      );
    }

    const accountId = uuidv4();
    const user = req.userRecord!;

    // Inserir registo com status "creating"
    await db.insert(schema.hostingAccounts).values({
      id: accountId,
      userId,
      domain: fullDomain,
      username: 'pending',
      passwordEncrypted: null,
      status: 'creating',
      packageName: pkg || env.mofh.defaultPackage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Chamada MOFH (async)
    try {
      const result = await mofhClient.createAccount({
        domain: fullDomain,
        email: user.email,
        package: pkg || env.mofh.defaultPackage,
      });

      if (result.status === 'success') {
        await db
          .update(schema.hostingAccounts)
          .set({
            username: result.username,
            passwordEncrypted: encrypt(result.password),
            status: 'active',
            cpanelUrl: `https://${fullDomain}:2083`,
            ftpHost: `ftp.${fullDomain}`,
            mysqlHost: 'localhost',
            nameservers: JSON.stringify([
              'ns1.byet.org',
              'ns2.byet.org',
            ]),
            mofhRef: result.username,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.hostingAccounts.id, accountId));

        logger.info('[accounts] account created via MOFH', {
          accountId,
          domain: fullDomain,
          mofhUser: result.username,
        });

        return ok(res, {
          id: accountId,
          domain: fullDomain,
          username: result.username,
          password: result.password, // one-time show
          status: 'active',
          cpanelUrl: `https://${fullDomain}:2083`,
          ftpHost: `ftp.${fullDomain}`,
          mysqlHost: 'localhost',
          nameservers: ['ns1.byet.org', 'ns2.byet.org'],
        }, 201);
      } else {
        await db
          .update(schema.hostingAccounts)
          .set({
            status: 'failed',
            suspensionReason: result.message,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.hostingAccounts.id, accountId));

        return fail(
          res,
          'MOFH_CREATE_FAILED',
          result.message || 'Failed to create account',
          502,
        );
      }
    } catch (err) {
      logger.error('[accounts] MOFH create error', { err: String(err) });
      await db
        .update(schema.hostingAccounts)
        .set({ status: 'failed', updatedAt: new Date().toISOString() })
        .where(eq(schema.hostingAccounts.id, accountId));
      return fail(
        res,
        'MOFH_ERROR',
        err instanceof Error ? err.message : 'Unknown error',
        502,
      );
    }
  }),
);

// ─── GET /accounts/:id ─────────────────────────────────────────
accountsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.id, req.params.id))
      .limit(1);

    const account = row[0];
    if (!account) return notFound(res, 'Account not found');
    if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    return ok(res, {
      ...account,
      password: account.passwordEncrypted ? decrypt(account.passwordEncrypted) : null,
      passwordEncrypted: undefined,
    });
  }),
);

// ─── POST /accounts/:id/suspend ────────────────────────────────
accountsRouter.post(
  '/:id/suspend',
  validate(suspendAccountSchema),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const row = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.id, req.params.id))
      .limit(1);

    const account = row[0];
    if (!account) return notFound(res, 'Account not found');
    if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    if (!mofhClient.isConfigured()) {
      return fail(res, 'MOFH_NOT_CONFIGURED', 'MOFH not configured', 503);
    }

    const result = await mofhClient.suspendAccount(account.username, reason);
    if (!result.success) {
      return fail(res, 'MOFH_SUSPEND_FAILED', result.message, 502);
    }

    await db
      .update(schema.hostingAccounts)
      .set({
        status: 'suspended',
        suspensionReason: reason,
        suspendedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.hostingAccounts.id, account.id));

    return ok(res, { suspended: true });
  }),
);

// ─── POST /accounts/:id/unsuspend ──────────────────────────────
accountsRouter.post(
  '/:id/unsuspend',
  asyncHandler(async (req, res) => {
    const row = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.id, req.params.id))
      .limit(1);

    const account = row[0];
    if (!account) return notFound(res, 'Account not found');
    if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    if (!mofhClient.isConfigured()) {
      return fail(res, 'MOFH_NOT_CONFIGURED', 'MOFH not configured', 503);
    }

    const result = await mofhClient.unsuspendAccount(account.username);
    if (!result.success) {
      return fail(res, 'MOFH_UNSUSPEND_FAILED', result.message, 502);
    }

    await db
      .update(schema.hostingAccounts)
      .set({
        status: 'active',
        suspensionReason: null,
        suspendedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.hostingAccounts.id, account.id));

    return ok(res, { unsuspended: true });
  }),
);

// ─── POST /accounts/:id/reset-password ─────────────────────────
accountsRouter.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const row = await db
      .select()
      .from(schema.hostingAccounts)
      .where(eq(schema.hostingAccounts.id, req.params.id))
      .limit(1);

    const account = row[0];
    if (!account) return notFound(res, 'Account not found');
    if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
      return forbidden(res);
    }

    if (!mofhClient.isConfigured()) {
      return fail(res, 'MOFH_NOT_CONFIGURED', 'MOFH not configured', 503);
    }

    const result = await mofhClient.resetPassword(account.username);
    if (!result.success) {
      return fail(res, 'MOFH_RESET_FAILED', result.message, 502);
    }

    await db
      .update(schema.hostingAccounts)
      .set({
        passwordEncrypted: encrypt(result.password),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.hostingAccounts.id, account.id));

    return ok(res, { password: result.password }); // one-time show
  }),
);
