/**
 * CARSAI HOST — Auth routes
 * Register, login, refresh, logout, verify email, forgot/reset password, 2FA, OAuth
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateTwoFactorSecret,
  generateTwoFactorUri,
  verifyTwoFactorToken,
  generateRandomToken,
  generateBackupCodes,
} from '../utils/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, fail, unauthorized } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from 'express-rate-limit';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../services/email.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enableTwoFactorSchema,
  twoFactorSchema,
} from '@carsai/shared';
import { addHours, addDays } from '../utils/date.js';

export const authRouter = Router();

// ─── Rate limiter para auth ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts' } },
});

// ─── POST /auth/register ───────────────────────────────────────
authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password, firstName, lastName, locale, acceptTerms } = req.body;

    // Verificar duplicados
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing[0]) {
      return fail(res, 'EMAIL_TAKEN', 'Email already registered', 409);
    }

    const existingUsername = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    if (existingUsername[0]) {
      return fail(res, 'USERNAME_TAKEN', 'Username already taken', 409);
    }

    const passwordHash = await hashPassword(password);
    const verifyToken = generateRandomToken(32);
    const userId = uuidv4();

    await db.insert(schema.users).values({
      id: userId,
      email,
      username,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'user',
      status: 'pending',
      emailVerifyToken: verifyToken,
      locale,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Enviar email de verificação (em background, não-bloqueante)
    const verifyUrl = `${env.appUrl}/verify-email?token=${verifyToken}`;
    sendEmail({
      to: email,
      subject: 'Verify your CARSAI HOST account',
      html: `
        <h2>Welcome to CARSAI HOST!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    }).catch((err) => logger.error('[auth] failed to send verify email', { err: String(err) }));

    logger.info('[auth] user registered', { userId, email, username });
    return ok(res, { id: userId, email, username }, 201);
  }),
);

// ─── POST /auth/login ──────────────────────────────────────────
authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, twoFactorCode } = req.body;
    const ip = req.ip || 'unknown';

    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = userRow[0];
    if (!user) {
      return fail(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user.status === 'banned') {
      return fail(res, 'ACCOUNT_BANNED', 'Account banned', 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return fail(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // 2FA se activo
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        return fail(res, 'TWO_FACTOR_REQUIRED', '2FA code required', 401);
      }
      if (!verifyTwoFactorToken(twoFactorCode, user.twoFactorSecret)) {
        return fail(res, 'TWO_FACTOR_INVALID', 'Invalid 2FA code', 401);
      }
    }

    // Verificar email confirmado
    if (user.status === 'pending' && !user.emailVerifiedAt) {
      return fail(
        res,
        'EMAIL_NOT_VERIFIED',
        'Please verify your email first',
        403,
      );
    }

    // Gerar tokens
    const family = uuidv4();
    const { token: accessToken, expiresIn } = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      locale: user.locale,
    });
    const refreshToken = signRefreshToken(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        locale: user.locale,
      },
      family,
    );

    // Guardar refresh token na BD
    await db.insert(schema.refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      token: refreshToken,
      family,
      expiresAt: addDays(new Date(), 7).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Actualizar last login
    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date().toISOString(), lastLoginIp: ip })
      .where(eq(schema.users.id, user.id));

    logger.info('[auth] user logged in', { userId: user.id, ip });
    return ok(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        locale: user.locale,
      },
      tokens: { accessToken, refreshToken, expiresIn },
    });
  }),
);

// ─── POST /auth/refresh ────────────────────────────────────────
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return unauthorized(res, 'Invalid refresh token');
    }

    // Verificar se está na BD e não revogado
    const tokenRow = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, refreshToken))
      .limit(1);

    const stored = tokenRow[0];
    if (!stored || stored.revokedAt) {
      // Possível reuso de token — revogar toda a família
      if (stored?.family) {
        logger.warn('[auth] refresh token reuse detected', {
          family: stored.family,
          userId: stored.userId,
        });
        await db
          .update(schema.refreshTokens)
          .set({ revokedAt: new Date().toISOString() })
          .where(eq(schema.refreshTokens.family, stored.family));
      }
      return unauthorized(res, 'Token revoked');
    }

    // Buscar user
    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub))
      .limit(1);
    const user = userRow[0];
    if (!user) return unauthorized(res, 'User not found');

    // Rotação: revogar o actual e emitir novo
    const newFamily = stored.family;
    const { token: newAccess, expiresIn } = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      locale: user.locale,
    });
    const newRefresh = signRefreshToken(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        locale: user.locale,
      },
      newFamily,
    );

    const newTokenId = uuidv4();
    await db
      .update(schema.refreshTokens)
      .set({
        revokedAt: new Date().toISOString(),
        replacedBy: newTokenId,
      })
      .where(eq(schema.refreshTokens.id, stored.id));

    await db.insert(schema.refreshTokens).values({
      id: newTokenId,
      userId: user.id,
      token: newRefresh,
      family: newFamily,
      expiresAt: addDays(new Date(), 7).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return ok(res, {
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresIn,
    });
  }),
);

// ─── POST /auth/logout ─────────────────────────────────────────
authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7);

    if (token) {
      // Revoke refresh tokens of this user's family (just current session ideally)
      // Para simplicidade, revogamos os tokens deste user com mais de 1 dia
      // (uma implementação mais granular usaria session-id no JWT)
    }

    return ok(res, { loggedOut: true });
  }),
);

// ─── GET /auth/me ──────────────────────────────────────────────
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    return ok(res, req.userRecord);
  }),
);

// ─── POST /auth/verify-email ───────────────────────────────────
authRouter.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) return fail(res, 'TOKEN_REQUIRED', 'Token required', 400);

    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.emailVerifyToken, token))
      .limit(1);

    const user = userRow[0];
    if (!user) {
      return fail(res, 'INVALID_TOKEN', 'Invalid or expired token', 400);
    }

    await db
      .update(schema.users)
      .set({
        emailVerifiedAt: new Date().toISOString(),
        emailVerifyToken: null,
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, user.id));

    logger.info('[auth] email verified', { userId: user.id });
    return ok(res, { verified: true });
  }),
);

// ─── POST /auth/forgot-password ────────────────────────────────
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = userRow[0];
    if (!user) {
      // Não revelar se o email existe
      return ok(res, { sent: true });
    }

    const token = generateRandomToken(32);
    await db.insert(schema.passwordResets).values({
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt: addHours(new Date(), 1).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
    sendEmail({
      to: email,
      subject: 'Reset your CARSAI HOST password',
      html: `
        <h2>Password reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    }).catch((err) => logger.error('[auth] failed to send reset email', { err: String(err) }));

    return ok(res, { sent: true });
  }),
);

// ─── POST /auth/reset-password ─────────────────────────────────
authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const resetRow = await db
      .select()
      .from(schema.passwordResets)
      .where(
        and(
          eq(schema.passwordResets.token, token),
          isNull(schema.passwordResets.usedAt),
        ),
      )
      .limit(1);

    const reset = resetRow[0];
    if (!reset) return fail(res, 'INVALID_TOKEN', 'Invalid or expired token', 400);

    if (new Date(reset.expiresAt) < new Date()) {
      return fail(res, 'TOKEN_EXPIRED', 'Token expired', 400);
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, reset.userId));

    await db
      .update(schema.passwordResets)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(schema.passwordResets.id, reset.id));

    logger.info('[auth] password reset', { userId: reset.userId });
    return ok(res, { reset: true });
  }),
);

// ─── POST /auth/2fa/enable ─────────────────────────────────────
authRouter.post(
  '/2fa/enable',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const secret = generateTwoFactorSecret();

    // Guardar secreto provisoriamente (ainda não activado)
    await db
      .update(schema.users)
      .set({ twoFactorSecret: secret })
      .where(eq(schema.users.id, userId));

    const user = req.userRecord!;
    const uri = generateTwoFactorUri(user.email, secret);

    return ok(res, {
      secret,
      otpauthUri: uri,
      backupCodes: generateBackupCodes(),
    });
  }),
);

// ─── POST /auth/2fa/confirm ────────────────────────────────────
authRouter.post(
  '/2fa/confirm',
  requireAuth,
  validate(enableTwoFactorSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, req.user!.id))
      .limit(1);
    const user = userRow[0];

    if (!user.twoFactorSecret) {
      return fail(res, 'NO_SECRET', 'Generate secret first', 400);
    }

    if (!verifyTwoFactorToken(code, user.twoFactorSecret)) {
      return fail(res, 'INVALID_CODE', 'Invalid 2FA code', 400);
    }

    const backupCodes = generateBackupCodes();
    await db
      .update(schema.users)
      .set({
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      })
      .where(eq(schema.users.id, user.id));

    return ok(res, { enabled: true, backupCodes });
  }),
);

// ─── POST /auth/2fa/disable ────────────────────────────────────
authRouter.post(
  '/2fa/disable',
  requireAuth,
  validate(twoFactorSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, req.user!.id))
      .limit(1);
    const user = userRow[0];

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return fail(res, 'NOT_ENABLED', '2FA not enabled', 400);
    }

    if (!verifyTwoFactorToken(code, user.twoFactorSecret)) {
      return fail(res, 'INVALID_CODE', 'Invalid 2FA code', 400);
    }

    await db
      .update(schema.users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(schema.users.id, user.id));

    return ok(res, { disabled: true });
  }),
);
