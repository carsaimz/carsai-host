/**
 * CARSAI HOST — Email service (Nodemailer)
 */
import nodemailer from 'nodemailer';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

interface EmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user && env.smtp.pass
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
  });
  return transporter;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: env.smtp.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    logger.info(`[email] sent to ${params.to}`, { subject: params.subject });
  } catch (err) {
    logger.error(`[email] failed to send to ${params.to}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
