/**
 * CARSAI HOST — Auth utilities
 * JWT, bcrypt, TOTP (2FA), refresh token rotation.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

const BCRYPT_ROUNDS = 12;

// ─── Password hashing ──────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ───────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;       // user id
  email: string;
  username: string;
  role: string;
  locale: string;
  type: 'access' | 'refresh';
  family?: string;   // refresh token family (rotation detection)
  jti: string;       // unique token id
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'jti' | 'iat' | 'exp'>): {
  token: string;
  expiresIn: number;
} {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, type: 'access', jti },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    } as jwt.SignOptions,
  );
  // Parse expiresIn (e.g. "15m") to seconds
  const expiresIn = parseExpiry(env.jwt.expiresIn);
  return { token, expiresIn };
}

export function signRefreshToken(
  payload: Omit<JwtPayload, 'type' | 'jti' | 'iat' | 'exp'>,
  family: string,
): string {
  const jti = uuidv4();
  return jwt.sign(
    { ...payload, type: 'refresh', jti, family },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    } as jwt.SignOptions,
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  }) as JwtPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwt.refreshSecret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  }) as JwtPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

function parseExpiry(exp: string): number {
  const m = exp.match(/^(\d+)([smhd])$/);
  if (!m) return 900;
  const n = parseInt(m[1], 10);
  const u = m[2];
  switch (u) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 900;
  }
}

// ─── 2FA (TOTP) ────────────────────────────────────────────────
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1,
};

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret(32);
}

export function generateTwoFactorUri(email: string, secret: string): string {
  return authenticator.keyuri(email, env.appName, secret);
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase(),
  );
}

// ─── Random tokens (email verification, password reset) ────────
export function generateRandomToken(length = 32): string {
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes.toString('hex');
}

// ─── Encryption (for FTP passwords at rest) ────────────────────
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'node:crypto';

const ENC_KEY = scryptSync(env.jwt.secret, 'carsai-salt', 32);
const ALGO = 'aes-256-gcm';

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(encBase64: string): string {
  const buf = Buffer.from(encBase64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, ENC_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

logger.debug('[auth] crypto utilities loaded');
