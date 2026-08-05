/**
 * CARSAI HOST — Shared types
 * Tipos TypeScript partilhados entre frontend, backend e mobile.
 */

// ─── Utilitários ────────────────────────────────────────────────
export type ID = string;
export type ISODate = string; // ISO 8601 string
export type Locale = 'pt' | 'en' | 'fr' | 'es';

// ─── Utilizador ────────────────────────────────────────────────
export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';

export interface User {
  id: ID;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: ISODate;
  twoFactorEnabled: boolean;
  avatarUrl?: string;
  locale: Locale;
  timezone?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  lastLoginAt?: ISODate;
}

export interface UserProfile extends User {
  accountsCount: number;
  ticketsOpen: number;
  storageUsedMb: number;
  bandwidthUsedMb: number;
}

// ─── Conta de hospedagem (MOFH) ────────────────────────────────
export type AccountStatus = 'creating' | 'active' | 'suspended' | 'terminated' | 'failed';

export interface HostingAccount {
  id: ID;
  userId: ID;
  domain: string;
  username: string;        // cPanel/VistaPanel username (8 chars)
  password?: string;       // FTP password (encrypted at rest)
  status: AccountStatus;
  packageName: string;     // MOFH package
  serverIp?: string;
  nameservers?: string[];
  cpanelUrl?: string;
  ftpHost?: string;
  mysqlHost?: string;
  mofhRef?: string;        // reference returned by MOFH
  suspensionReason?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  suspendedAt?: ISODate;
}

// ─── Domínio / DNS ─────────────────────────────────────────────
export type DomainType = 'subdomain' | 'addon' | 'parked';
export type DomainStatus = 'pending' | 'active' | 'inactive';

export interface Domain {
  id: ID;
  accountId: ID;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  dnsRecords?: DnsRecord[];
  sslIssued?: boolean;
  sslExpiresAt?: ISODate;
  createdAt: ISODate;
}

export interface DnsRecord {
  id: ID;
  domainId: ID;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

// ─── Tickets de suporte ────────────────────────────────────────
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: ID;
  userId: ID;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  department: 'general' | 'technical' | 'abuse' | 'billing';
  assignedTo?: ID;
  replies: TicketReply[];
  attachments?: Attachment[];
  createdAt: ISODate;
  updatedAt: ISODate;
  closedAt?: ISODate;
}

export interface TicketReply {
  id: ID;
  ticketId: ID;
  userId: ID;
  body: string;
  isStaff: boolean;
  attachments?: Attachment[];
  createdAt: ISODate;
}

// ─── Blog ──────────────────────────────────────────────────────
export type PostStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id: ID;
  slug: string;
  title: string;
  excerpt: string;
  content: string;       // markdown
  coverImage?: string;
  authorId: ID;
  category: string;
  tags: string[];
  status: PostStatus;
  views: number;
  publishedAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ─── Fórum ─────────────────────────────────────────────────────
export interface ForumCategory {
  id: ID;
  name: string;
  slug: string;
  description: string;
  order: number;
  topicsCount: number;
}

export interface ForumTopic {
  id: ID;
  categoryId: ID;
  userId: ID;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  views: number;
  repliesCount: number;
  lastReplyAt?: ISODate;
  createdAt: ISODate;
}

export interface ForumReply {
  id: ID;
  topicId: ID;
  userId: ID;
  body: string;
  createdAt: ISODate;
  updatedAt?: ISODate;
}

// ─── Anexos ────────────────────────────────────────────────────
export interface Attachment {
  id: ID;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: ISODate;
}

// ─── Audit Log ─────────────────────────────────────────────────
export interface AuditLog {
  id: ID;
  userId?: ID;
  action: string;
  resource: string;
  resourceId?: ID;
  ip: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODate;
}

// ─── API ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ─── Auth ──────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

// ─── Webhooks ──────────────────────────────────────────────────
export interface Webhook {
  id: ID;
  userId: ID;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  lastTriggeredAt?: ISODate;
  createdAt: ISODate;
}

// ─── Cron Jobs ─────────────────────────────────────────────────
export interface CronJob {
  id: ID;
  accountId: ID;
  name: string;
  command: string;
  schedule: string;      // cron expression
  active: boolean;
  lastRunAt?: ISODate;
  nextRunAt?: ISODate;
  createdAt: ISODate;
}

// ─── Backups ───────────────────────────────────────────────────
export type BackupProvider = 'local' | 'gdrive' | 'dropbox';

export interface Backup {
  id: ID;
  accountId: ID;
  provider: BackupProvider;
  filename: string;
  sizeMb: number;
  status: 'pending' | 'completed' | 'failed';
  url?: string;
  createdAt: ISODate;
}

// ─── Notificações ──────────────────────────────────────────────
export interface Notification {
  id: ID;
  userId: ID;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: ISODate;
}
