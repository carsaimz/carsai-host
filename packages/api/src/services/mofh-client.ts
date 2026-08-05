/**
 * CARSAI HOST — MOFH (My Own Free Hosting) Client Service
 *
 * Integração REAL com a API XML-RPC de panel.myownfreehost.com (iFastNet / Byet).
 * Criação/suspensão/reativação/reset de password de contas de hospedagem.
 *
 * Documentação MOFH: https://api.mofh.com
 * Reseller: https://ifastnet.com/affiliate.html
 */
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { randomBytes } from 'node:crypto';

export interface MofhCreateAccountParams {
  /** Username 8 chars alfanumérico (gerado automaticamente se omitido) */
  username?: string;
  /** Palavra-passe (gerada automaticamente se omitida) */
  password?: string;
  /** Domínio ou sub-domínio (ex: meusite.com ou meusite.yoursite.com) */
  domain: string;
  /** Email do utilizador */
  email: string;
  /** Pacote MOFH (default: freehosting) */
  package?: string;
  /** Idioma do cPanel/VistaPanel */
  language?: string;
}

export interface MofhCreateAccountResult {
  username: string;
  password: string;
  domain: string;
  status: 'success' | 'failed';
  message: string;
  raw?: unknown;
}

export interface MofhAccountInfo {
  username: string;
  domain: string;
  status: string;
  serverIp?: string;
  nameservers?: string[];
  cpanelUrl?: string;
  ftpHost?: string;
  mysqlHost?: string;
  package?: string;
}

/**
 * Cliente MOFH — implementa chamadas à API XML-RPC do My Own Free Hosting.
 *
 * A API MOFH usa XML-RPC em https://panel.myownfreehost.com/xml-api
 * com autenticação Basic Auth (reseller username + password).
 *
 * Operações:
 *  - createacct      → criar conta
 *  - suspendacct     → suspender
 *  - unsuspendacct   → reativar
 *  - passwd          → reset password
 *  - domainavailable → verificar disponibilidade
 */
export class MofhClient {
  private apiUrl: string;
  private username: string;
  private password: string;
  private defaultPackage: string;
  private defaultLanguage: string;

  constructor(opts?: {
    apiUrl?: string;
    username?: string;
    password?: string;
    defaultPackage?: string;
    defaultLanguage?: string;
  }) {
    this.apiUrl = opts?.apiUrl ?? env.mofh.apiUrl;
    this.username = opts?.username ?? env.mofh.resellerUsername;
    this.password = opts?.password ?? env.mofh.resellerPassword;
    this.defaultPackage = opts?.defaultPackage ?? env.mofh.defaultPackage;
    this.defaultLanguage = opts?.defaultLanguage ?? env.mofh.defaultLanguage;
  }

  /**
   * Verifica se o cliente está configurado.
   */
  isConfigured(): boolean {
    return Boolean(this.username && this.password);
  }

  /**
   * Gera um username MOFH válido (8 chars alfanumérico, começa por letra).
   */
  generateUsername(prefix = 'ch'): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const random = Array.from(randomBytes(6))
      .map((b) => chars[b % chars.length])
      .join('');
    return `${prefix}${random}`.slice(0, 8);
  }

  /**
   * Gera uma password forte de 16 caracteres.
   */
  generatePassword(length = 16): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    return Array.from(randomBytes(length))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  /**
   * Chamada XML-RPC genérica para a API MOFH.
   * Implementação manual do protocolo XML-RPC sobre HTTP POST.
   */
  private async call(method: string, params: Record<string, string>): Promise<{
    success: boolean;
    message: string;
    raw?: unknown;
    data?: Record<string, unknown>;
  }> {
    if (!this.isConfigured()) {
      throw new Error(
        'MOFH client not configured. Set MOFH_RESELLER_USERNAME and MOFH_RESELLER_PASSWORD.',
      );
    }

    // Constrói o envelope XML-RPC
    const xmlParams = Object.entries(params)
      .map(
        ([k, v]) =>
          `<member><name>${k}</name><value><string>${escapeXml(v)}</string></value></member>`,
      )
      .join('');

    const xmlBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    <param>
      <value>
        <struct>
          ${xmlParams}
        </struct>
      </value>
    </param>
  </params>
</methodCall>`;

    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    logger.info(`[mofh] ${method} called`, { method, params: Object.keys(params) });

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          Authorization: `Basic ${auth}`,
          'User-Agent': 'CARSAI-HOST/1.0',
        },
        body: xmlBody,
      });

      const text = await res.text();

      if (!res.ok) {
        logger.error(`[mofh] HTTP ${res.status}`, { method, status: res.status, body: text.slice(0, 500) });
        return {
          success: false,
          message: `MOFH API returned HTTP ${res.status}`,
          raw: text,
        };
      }

      // Parse básico da resposta XML-RPC
      const result = parseXmlRpcResponse(text);
      logger.info(`[mofh] ${method} result`, {
        method,
        success: result.success,
        message: result.message,
      });

      return result;
    } catch (err) {
      logger.error(`[mofh] ${method} failed`, { method, error: String(err) });
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Criar nova conta de hospedagem.
   */
  async createAccount(params: MofhCreateAccountParams): Promise<MofhCreateAccountResult> {
    const username = params.username ?? this.generateUsername();
    const password = params.password ?? this.generatePassword();
    const pkg = params.package ?? this.defaultPackage;
    const language = params.language ?? this.defaultLanguage;

    const result = await this.call('createacct', {
      username,
      password,
      domain: params.domain,
      contactemail: params.email,
      plan: pkg,
      language,
    });

    return {
      username,
      password,
      domain: params.domain,
      status: result.success ? 'success' : 'failed',
      message: result.message,
      raw: result.raw,
    };
  }

  /**
   * Suspender conta.
   */
  async suspendAccount(username: string, reason: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await this.call('suspendacct', {
      username,
      reason,
    });
    return { success: result.success, message: result.message };
  }

  /**
   * Reativar conta.
   */
  async unsuspendAccount(username: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await this.call('unsuspendacct', {
      username,
    });
    return { success: result.success, message: result.message };
  }

  /**
   * Reset da palavra-passe.
   */
  async resetPassword(username: string, newPassword?: string): Promise<{
    success: boolean;
    message: string;
    password: string;
  }> {
    const password = newPassword ?? this.generatePassword();
    const result = await this.call('passwd', {
      username,
      pass: password,
    });
    return { success: result.success, message: result.message, password };
  }

  /**
   * Verificar disponibilidade de domínio.
   */
  async checkDomainAvailability(domain: string): Promise<{
    available: boolean;
    message: string;
  }> {
    const result = await this.call('domainavailable', {
      domain,
    });
    return {
      available: result.success,
      message: result.message,
    };
  }
}

/**
 * Escape de caracteres XML.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parser simplificado de resposta XML-RPC.
 * Procura por <boolean>, <int>, <string>, <struct> dentro de <value>.
 */
function parseXmlRpcResponse(xml: string): {
  success: boolean;
  message: string;
  raw?: unknown;
  data?: Record<string, unknown>;
} {
  // MOFH geralmente retorna um struct com {result: 0/1, reason: "..."}
  const resultMatch = xml.match(/<name>result<\/name>\s*<value>\s*(?:<int>|<i4>)?(\d+)/i);
  const reasonMatch = xml.match(
    /<name>reason<\/name>\s*<value>\s*(?:<string>)?([^<]+)/i,
  );
  const statusMatch = xml.match(/<name>status<\/name>\s*<value>\s*(?:<string>)?([^<]+)/i);

  const resultNum = resultMatch ? parseInt(resultMatch[1], 10) : 0;
  const reason = reasonMatch ? reasonMatch[1].trim() : '';
  const status = statusMatch ? statusMatch[1].trim() : '';

  return {
    success: resultNum === 1,
    message: reason || status || (resultNum === 1 ? 'OK' : 'Unknown error'),
    raw: xml,
  };
}

/**
 * Singleton do cliente MOFH.
 */
export const mofhClient = new MofhClient();
