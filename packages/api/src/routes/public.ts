/**
 * CARSAI HOST — Public routes (NO server statistics — authenticated areas only)
 *
 * Restrição: páginas públicas NÃO mostram estatísticas de servidor.
 * Apenas endpoints de saúde (UP/DOWN) e info de marca são expostos publicamente.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/response.js';
import { env } from '../utils/env.js';
import { APP_NAME, APP_VERSION, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@carsai/shared';
import { contactSchema } from '@carsai/shared';
import { validate } from '../middleware/validate.js';
import { sendEmail } from '../services/email.js';
import { logger } from '../utils/logger.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const publicRouter = Router();

// ─── GET /health ───────────────────────────────────────────────
// Apenas UP/DOWN — SEM estatísticas de servidor.
publicRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    return ok(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
);

// ─── GET /info ─────────────────────────────────────────────────
// Informação pública de marca (sem stats de servidor/infra).
publicRouter.get(
  '/info',
  asyncHandler(async (_req, res) => {
    return ok(res, {
      name: APP_NAME,
      version: APP_VERSION,
      description: 'Free web hosting platform with iFastNet + MOFH',
      locales: SUPPORTED_LOCALES,
      defaultLocale: DEFAULT_LOCALE,
      installed: isInstalled(),
      // NOTA: estatísticas de servidor (uptime, CPU, RAM, contas totais)
      // são deliberadamente OMITIDAS da área pública.
    });
  }),
);

// ─── POST /contact ─────────────────────────────────────────────
publicRouter.post(
  '/contact',
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message, honeypot } = req.body;
    if (honeypot) {
      // Bot detected
      return ok(res, { sent: true });
    }

    try {
      await sendEmail({
        to: env.smtp.user || 'support@carsai.host',
        subject: `[Contact] ${subject}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message}</p>
        `,
      });
    } catch (err) {
      logger.error('[public] contact email failed', { err: String(err) });
    }

    return ok(res, { sent: true });
  }),
);

// ─── Helper: check if installed ────────────────────────────────
function isInstalled(): boolean {
  const lockfile = resolve(process.cwd(), env.installedLockfile);
  return existsSync(lockfile);
}
