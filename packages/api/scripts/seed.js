/**
 * CARSAI HOST — Seed script
 * Insere dados de exemplo: blog posts, categorias do fórum (já vêm da migration),
 * e cria um utilizador admin de desenvolvimento.
 *
 * Uso: node scripts/seed.js
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || './data/carsai.db';
const dbPath = resolve(root, dbUrl);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const now = new Date().toISOString();

// ─── Create dev admin user ─────────────────────────────────────
const adminEmail = 'admin@carsai.host';
const adminUser = 'admin';
const adminPass = 'Admin1234';

const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
let adminId;
if (existingAdmin) {
  adminId = existingAdmin.id;
  console.log(`[seed] admin already exists: ${adminEmail}`);
} else {
  adminId = uuidv4();
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, role, status, email_verified_at, locale, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', 'active', ?, 'pt', ?, ?)
  `).run(adminId, adminEmail, adminUser, hash, now, now, now);
  console.log(`[seed] created admin: ${adminEmail} / ${adminPass}`);
}

// ─── Sample blog posts ─────────────────────────────────────────
const posts = [
  {
    slug: 'bem-vindo-ao-carsai-host',
    title: 'Bem-vindo ao CARSAI HOST',
    excerpt: 'Conheça a plataforma de hospedagem 100% gratuita que vai mudar a sua presença online.',
    content: `# Bem-vindo ao CARSAI HOST

O **CARSAI HOST** é uma plataforma de hospedagem web **100% gratuita** que permite a qualquer utilizador criar a sua própria conta de hospedagem partilhada em servidores reais fornecidos pela iFastNet (Byet).

## O que oferecemos

- **Espaço em disco** generoso para o seu site
- **Tráfego mensal** ilimitado
- **Base de dados MySQL** ilimitadas
- **Certificados SSL** gratuitos (Let's Encrypt)
- **Painel de controlo** moderno inspirado no Xera
- **Suporte multi-idioma** (PT, EN, FR, ES)
- **App mobile** para iOS e Android

## Como começar

1. Crie a sua conta gratuita
2. Verifique o email
3. Crie a sua primeira conta de hospedagem
4. Comece a construir o seu site!

Tudo isto sem cartão de crédito, sem custos ocultos, sem pegadinhas. Acreditamos que a internet deve ser acessível a todos.`,
    category: 'news',
    tags: ['anuncio', 'plataforma'],
  },
  {
    slug: 'como-instalar-wordpress-em-3-passos',
    title: 'Como instalar WordPress em 3 passos',
    excerpt: 'Guia passo-a-passo para instalar o WordPress na sua conta CARSAI HOST usando o Softaculous.',
    content: `# Instalar WordPress em 3 passos

O WordPress é o CMS mais popular do mundo, usado por mais de 40% dos sites. Com o CARSAI HOST, pode instalá-lo em segundos.

## Passo 1: Aceda ao Softaculous

No seu painel de controlo, vá a **Aplicações → Softaculous**.

## Passo 2: Escolha WordPress

Procure por "WordPress" e clique em **Instalar**.

## Passo 3: Configure

- Escolha o domínio onde instalar
- Defina um nome de utilizador e palavra-passe fortes
- Configure um email administrativo
- Clique em **Instalar**

Em menos de 1 minuto, o seu WordPress estará pronto a usar!

## Dicas

- Use palavras-passe fortes (mínimo 12 caracteres)
- Mantenha o WordPress e os plugins actualizados
- Faça backups regulares
- Instale apenas plugins de fontes confiáveis`,
    category: 'tutorials',
    tags: ['wordpress', 'tutorial', 'softaculous'],
  },
  {
    slug: 'seguranca-2fa-como-proteger-a-sua-conta',
    title: 'Segurança 2FA: como proteger a sua conta',
    excerpt: 'Aprenda a activar a verificação em dois passos para uma camada extra de segurança.',
    content: `# Proteja a sua conta com 2FA

A **verificação em dois passos** (2FA) é uma camada extra de segurança que protege a sua conta mesmo que alguém descubra a sua palavra-passe.

## Como funciona

Quando activa o 2FA, precisa de dois fatores para entrar:

1. **Algo que sabe** — a sua palavra-passe
2. **Algo que tem** — um código gerado pela sua app de autenticação

## Como activar

1. Vá a **Perfil → Segurança**
2. Clique em **Activar 2FA**
3. Leia o QR code com uma app como:
   - Google Authenticator
   - Authy
   - Microsoft Authenticator
   - 1Password
4. Introduza o código de 6 dígitos para confirmar
5. Guarde os códigos de backup num local seguro

## Recomendações

- Active 2FA em todas as contas importantes
- Use apps dedicadas em vez de SMS
- Guarde os códigos de backup offline
- Faça backup do secreto TOTP em local seguro`,
    category: 'tutorials',
    tags: ['seguranca', '2fa', 'tutorial'],
  },
];

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO blog_posts (id, slug, title, excerpt, content, author_id, category, tags, status, views, published_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?, ?)
`);

for (const post of posts) {
  const id = uuidv4();
  insertPost.run(
    id,
    post.slug,
    post.title,
    post.excerpt,
    post.content,
    adminId,
    post.category,
    JSON.stringify(post.tags),
    now,
    now,
    now,
  );
}
console.log(`[seed] inserted ${posts.length} blog posts`);

// ─── Sample forum topics ───────────────────────────────────────
const topics = [
  {
    categoryId: '00000000-0000-0000-0000-000000000001', // Announcements
    title: 'Lançamento oficial do CARSAI HOST',
    body: 'Temos o prazer de anunciar o lançamento oficial da plataforma CARSAI HOST! Esta é a versão 1.0.0 com todas as funcionalidades principais. Partilhem feedback neste tópico.',
  },
  {
    categoryId: '00000000-0000-0000-0000-000000000003', // Technical Support
    title: 'FAQ: Perguntas frequentes',
    body: 'Este tópico serve para recolher as perguntas mais frequentes. Se tem uma dúvida, verifique aqui antes de abrir um ticket.',
  },
];

const insertTopic = db.prepare(`
  INSERT INTO forum_topics (id, category_id, user_id, title, body, pinned, locked, views, last_reply_at, created_at)
  VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
`);

for (const t of topics) {
  insertTopic.run(uuidv4(), t.categoryId, adminId, t.title, t.body, now, now);
}
console.log(`[seed] inserted ${topics.length} forum topics`);

db.close();
console.log('[seed] done');
