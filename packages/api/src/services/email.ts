/**
 * CARSAI HOST — Email service (Nodemailer)
 *
 * Lê a configuração SMTP da tabela `settings` (com fallback para env).
 * O transport é recriado quando as configurações mudem — detectamos
 * isso comparando o hash das configs atuais com as usadas na última
 * criação do transport.
 */
import nodemailer from 'nodemailer';
import { getSmtpConfig } from './settings.js';
import { logger } from '../utils/logger.js';

interface EmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;
let lastConfigHash = '';

function hashConfig(cfg: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}): string {
  return `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${cfg.pass.length}|${cfg.from}`;
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  const cfg = await getSmtpConfig();
  const h = hashConfig(cfg);
  if (transporter && h === lastConfigHash) return transporter;

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  lastConfigHash = h;
  logger.info('[email] transporter recreated', {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    hasAuth: Boolean(cfg.user && cfg.pass),
  });
  return transporter;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  try {
    const t = await getTransporter();
    const cfg = await getSmtpConfig();
    await t.sendMail({
      from: cfg.from,
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
