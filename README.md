# CARSAI HOST

> **Plataforma de hospedagem web 100% gratuita** — servidores reais fornecidos pela
> **iFastNet (Byet)** via integração **MOFH** (My Own Free Hosting). Inspiração de
> design no **Xera** (painel PHP). Suporte multi-idioma (PT, EN, FR, ES, ...).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.5-blue)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/react-18-61dafb)](https://react.dev)

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Princípios do Projecto](#-princípios-do-projecto)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Arquitectura](#-arquitectura)
5. [Estrutura do Monorepo](#-estrutura-do-monorepo)
6. [Início Rápido (Quickstart)](#-início-rápido-quickstart)
7. [Instalador Web](#-instalador-web)
8. [Variáveis de Ambiente](#-variáveis-de-ambiente)
9. [Integração iFastNet / MOFH](#-integração-ifastnet--mofh)
10. [Multi-idioma (i18n)](#-multi-idioma-i18n)
11. [API REST](#-api-rest)
12. [Mobile (Capacitor)](#-mobile-capacitor)
13. [Documentação](#-documentação)
14. [Segurança](#-segurança)
15. [Contribuir](#-contribuir)
16. [Licença](#-licença)

---

## 🚀 Visão Geral

O **CARSAI HOST** é uma plataforma de hospedagem web **completamente gratuita** que
permite a qualquer utilizador criar e gerir contas de hospedagem partilhada
(Apache + MySQL + FTP) num infraestrutura real fornecida pela **iFastNet (Byet)**.

A diferença em relação a outros painéis:

- ❌ **Sem planos** — não existem tiers gratuitos / pagos / premium.
- ❌ **Sem preços** — todo o serviço é 100% gratuito.
- ❌ **Sem estatísticas públicas de servidor** — dados de infraestrutura só
  visíveis em áreas autenticadas (dashboard / admin).
- ✅ **Servidores reais via iFastNet/Byet** — não há simulação.
- ✅ **Integração real com MOFH** — criação/suspensão/reativação de contas via API.
- ✅ **Design inspirado no Xera** — UX/UI limpa e funcional.
- ✅ **Multi-idioma** — PT, EN, FR, ES, expansível.

### Funcionalidades principais

| Área | Descrição |
|------|-----------|
| **Auth** | Registo, login, JWT + refresh, 2FA TOTP, verificação por email, OAuth Google/GitHub |
| **Dashboard** | Visão geral (com estatísticas), atalhos, estado da conta |
| **Gestor de Ficheiros** | Upload/download, editar, extrair ZIP, permissões |
| **Gestor de Base de Dados** | Criar/acessar MySQL via phpMyAdmin integrado |
| **Domínios / DNS** | Sub-domínios gratuitos, domínios próprios, registos DNS |
| **SSL** | Let's Encrypt / ZeroSSL / GoGetSSL via acme-client |
| **MOFH** | Criação/suspensão/reativação de conta, reset de palavra-passe |
| **Softaculous** | Instalação 1-click de apps (WordPress, Joomla, etc.) |
| **Tickets** | Sistema de suporte com prioridades e anexos |
| **Blog** | CMS interno com categorias, tags, SEO |
| **Fórum** | Fóruns, tópicos, respostas, moderação |
| **API de Desenvolvedor** | Tokens, rate-limit, documentação OpenAPI |
| **Backups** | Google Drive / Dropbox / local |
| **Monitorização** | Uptime, recursos, alertas |
| **CDN** | Integração opcional |
| **Afiliados** | Convites, comissões (não monetárias — créditos) |
| **Cron Jobs** | Agendador de tarefas |
| **Analytics** | Estatísticas de visitas (apenas área autenticada) |
| **Mobile** | App Capacitor (iOS + Android) |
| **Webhooks** | Eventos outbound |
| **Audit Log** | Trilha de auditoria |
| **Plugins** | Arquitectura de extensões |

---

## 🎯 Princípios do Projecto

1. **100% gratuito** — nenhum recurso está à venda.
2. **Dados reais** — base de dados real, MOFH API real, sem mocks.
3. **Sem estatísticas públicas** —performance/infraestrutura só em áreas autenticadas.
4. **i18n-first** — toda a interface é traduzível.
5. **Design Xera-inspired** — UI limpa, com sidebar, cards e tabela de acções.
6. **Documentação real** — cada funcionalidade tem documentação completa.

---

## 🛠 Stack Tecnológico

### Frontend (`packages/web`)
- React 18 + TypeScript 5.5
- Vite 5
- Tailwind CSS 3 + shadcn/ui
- React Router v6
- TanStack Query v5
- Zustand (estado)
- react-hook-form + Zod
- Monaco Editor (editor de código)
- Chart.js (gráficos)
- i18next + react-i18next

### Backend (`packages/api`)
- Node.js 20+ + Express 4
- TypeScript 5.5
- Drizzle ORM + better-sqlite3
- JWT (jsonwebtoken) + refresh tokens
- bcrypt + OTP autenticator (2FA)
- Helmet + CORS + express-rate-limit
- Winston (logs)
- Nodemailer (email)
- Bull + BullMQ (filas)
- **mofh-client** (integração iFastNet/Byet)
- acme-client (SSL Let's Encrypt)
- multer + sharp (uploads)
- adm-zip (extrair arquivos)

### Mobile (`packages/mobile`)
- Capacitor 6
- iOS + Android nativo
- Plugins: Filesystem, Biometrics, Push Notifications, Camera, Share, SQLite

### Shared (`packages/shared`)
- Tipos TypeScript partilhados
- Schemas Zod (validação client + server)
- Pacotes de tradução i18n

### Installer (`packages/installer`)
- App React standalone que corre em `/install` na primeira execução
- Verifica requisitos, configura DB, cria admin, regista credenciais MOFH

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Mobile App                      │
│  React SPA (public pages + dashboard + admin)                │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS (REST + WebSocket)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express API                             │
│  /api/v1/*  ──►  routes ─► middleware ─► services            │
│                  JWT auth, rate-limit, validation (Zod)       │
│                  Queues (Bull) ──► background jobs            │
└───────┬───────────────┬───────────────┬─────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
│  SQLite      │ │  Nodemailer  │ │  MOFH Client    │
│  (Drizzle)   │ │  (SMTP)      │ │  ──► iFastNet   │
│  users,      │ │              │ │      (Byet)     │
│  accounts,   │ └──────────────┘ │  create/suspend │
│  tickets...  │                  │  /reactivate    │
└──────────────┘                  └────────┬────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │ Apache + MySQL + FTP     │
                              │ (servidores iFastNet)    │
                              └──────────────────────────┘
```

---

## 📁 Estrutura do Monorepo

```
carsai-host/
├── packages/
│   ├── web/                # Frontend React + Vite
│   ├── api/                # Backend Express + Drizzle
│   ├── shared/             # Tipos, schemas Zod, traduções
│   ├── mobile/             # App Capacitor
│   ├── installer/          # Instalador web standalone
│   └── docs/               # Documentação Markdown
├── docker/                 # Dockerfiles + compose
├── scripts/                # Scripts de build / deploy
├── .github/workflows/      # CI/CD
├── turbo.json              # Pipeline Turbo
├── pnpm-workspace.yaml     # Workspaces pnpm
└── package.json            # Raiz
```

---

## 🏁 Início Rápido (Quickstart)

### Pré-requisitos

- **Node.js** ≥ 20.0.0 — [instalar](https://nodejs.org/)
- **pnpm** ≥ 9.0.0 — `npm install -g pnpm`
- **Git** — [instalar](https://git-scm.com/)
- **Conta iFastNet RESELLER** — para obter credenciais MOFH
  (https://ifastnet.com)

### Passo a passo

```bash
# 1. Clonar
git clone https://github.com/carsaimz/carsai-host.git
cd carsai-host

# 2. Instalar dependências
pnpm install

# 3. Copiar variáveis de ambiente
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# 4. Gerar migrations Drizzle
pnpm db:generate

# 5. Correr migrations (cria SQLite + tabelas)
pnpm db:migrate

# 6. Iniciar ambiente de desenvolvimento
pnpm dev
```

Acesse:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1/health
- **Instalador** (primeira execução): http://localhost:5173/install

> Na **primeira execução**, o instalador cria o ficheiro `.env` final, configura
> a base de dados e cria o utilizador administrador. Após instalar, o instalador
> fica bloqueado e só pode ser reactivado eliminando `data/.installed`.

---

## 🔧 Instalador Web

O CARSAI HOST inclui um instalador React-based (em `packages/installer`) que corre
em `/install` na primeira execução. Ele:

1. Verifica requisitos do sistema (Node, permissões, etc.)
2. Testa conexão com a base de dados (SQLite local ou MySQL externo)
3. Corre migrations Drizzle automaticamente
4. Cria o utilizador administrador inicial
5. Regista credenciais MOFH (reseller username + password)
6. Gera `.env` final com chaves JWT e segredos aleatórios
7. Marca o sistema como instalado (`data/.installed`)

Após a instalação, o endpoint `/install` retorna **404** por defeito.

---

## 🔐 Variáveis de Ambiente

Veja `packages/api/.env.example` e `packages/web/.env.example` para a lista
completa. As variáveis críticas incluem:

### API
```bash
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173
API_URL=http://localhost:3000

# Database
DATABASE_URL=./data/carsai.db

# JWT
JWT_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MOFH (iFastNet / Byet)
MOFH_API_URL=https://panel.myownfreehost.com/xml-api
MOFH_RESELLER_USERNAME=<your-ifastnet-reseller-user>
MOFH_RESELLER_PASSWORD=<your-ifastnet-reseller-password>
MOFH_DEFAULT_DOMAIN=yoursite.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="CARSAI HOST <noreply@carsai.host>"

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Web
```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=CARSAI HOST
VITE_DEFAULT_LOCALE=pt
```

---

## 🌐 Integração iFastNet / MOFH

A integração com a iFastNet (Byet) é feita através do **MOFH client**
(`mofh-client` no npm), que comunica com a API XML-RPC de
`panel.myownfreehost.com`.

### Operações suportadas

| Operação | Endpoint MOFH | Descrição |
|----------|---------------|-----------|
| Criar conta | `createacct` | Cria conta partilhada (cPanel/VistaPanel) |
| Suspender | `suspendacct` | Suspende conta por motivo |
| Reativar | `unsuspendacct` | Reativa conta suspensa |
| Reset password | `passwd` | Reseta palavra-passe FTP/cPanel |
| Listar domínios | `domainavailable` | Verifica disponibilidade de domínio |

### Como obter credenciais MOFH

1. Regista-te em https://ifastnet.com/affiliate.html como **reseller**.
2. No painel de reseller, acede a **API Settings**.
3. Copia o **Username** e **Password** da API.
4. Coloca esses valores em `MOFH_RESELLER_USERNAME` e `MOFH_RESELLER_PASSWORD`.

> ⚠️ As credenciais MOFH são **pessoais e secretas**. Nunca as exponhas no
> frontend ou em logs públicos.

---

## 🌍 Multi-idioma (i18n)

Idiomas suportados (em `packages/shared/src/i18n/`):

| Código | Idioma | Ficheiro |
|--------|--------|----------|
| `pt` | Português (default) | `pt.json` |
| `en` | English | `en.json` |
| `fr` | Français | `fr.json` |
| `es` | Español | `es.json` |

Para adicionar um novo idioma:

1. Copia `packages/shared/src/i18n/en.json` para `<code>.json`.
2. Traduz todas as chaves.
3. Regista o idioma em `packages/shared/src/i18n/index.ts`.
4. Adiciona a flag e o nome em `packages/web/src/i18n/config.ts`.

A detecção de idioma segue a ordem:
1. Preferência guardada no `localStorage`
2. Cookie `locale`
3. Header `Accept-Language`
4. Idioma por defeito (`pt`)

---

## 🔌 API REST

A API segue o padrão RESTful em `/api/v1/*`. Documentação OpenAPI completa em
`packages/docs/api/openapi.yaml`.

### Endpoints principais

```
POST   /api/v1/auth/register           # Registar
POST   /api/v1/auth/login              # Login
POST   /api/v1/auth/refresh            # Renovar token
POST   /api/v1/auth/logout             # Logout
GET    /api/v1/auth/me                 # Perfil do utilizador

POST   /api/v1/accounts                # Criar conta MOFH
GET    /api/v1/accounts                # Listar minhas contas
GET    /api/v1/accounts/:id            # Detalhe de conta
POST   /api/v1/accounts/:id/suspend    # Suspender
POST   /api/v1/accounts/:id/unsuspend  # Reativar
POST   /api/v1/accounts/:id/reset-pass # Reset FTP password

GET    /api/v1/files/:accountId        # Listar ficheiros
POST   /api/v1/files/:accountId        # Upload
DELETE /api/v1/files/:accountId/:path  # Eliminar
POST   /api/v1/files/:accountId/extract# Extrair ZIP

GET    /api/v1/domains                 # Listar domínios
POST   /api/v1/domains                 # Adicionar domínio

POST   /api/v1/ssl/issue               # Emitir SSL (Let's Encrypt)

GET    /api/v1/tickets                 # Listar tickets
POST   /api/v1/tickets                 # Criar ticket
POST   /api/v1/tickets/:id/reply       # Responder

GET    /api/v1/blog/posts              # Posts do blog
GET    /api/v1/blog/posts/:slug        # Post por slug

GET    /api/v1/forum/categories        # Categorias do fórum
POST   /api/v1/forum/topics            # Criar tópico
```

### Autenticação

Todas as rotas autenticadas requerem o header:

```
Authorization: Bearer <jwt-token>
```

Rate-limit global: **100 req / 15 min** por IP. Endpoints de auth: **5 req / 15 min**.

---

## 📱 Mobile (Capacitor)

A app mobile (em `packages/mobile`) é construída com Capacitor 6 e partilha o
frontend React. Suporta:

- **iOS** e **Android** nativos
- Login biométrico (Face ID / Touch ID)
- Push notifications
- Partilha de ficheiros nativa
- Câmera (para screenshots de suporte)
- SQLite local para cache offline

Para gerar builds:

```bash
cd packages/mobile
pnpm install
npx cap sync

# iOS (requer macOS + Xcode)
npx cap open ios

# Android
npx cap open android
```

---

## 📚 Documentação

Toda a documentação está em `packages/docs/`:

- `INSTALL.md` — guia de instalação detalhado
- `ARCHITECTURE.md` — diagramas e decisões técnicas
- `API.md` — referência completa da API REST
- `I18N.md` — guia de tradução
- `SECURITY.md` — práticas de segurança
- `CONTRIBUTING.md` — como contribuir
- `DEPLOYMENT.md` — deploy em produção (Docker / PM2 / Nginx)
- `MOFH.md` — guia da integração iFastNet/MOFH

---

## 🔒 Segurança

- **JWT** com expiração curta (15min) + **refresh token** (7 dias, rotação)
- **bcrypt** com cost factor 12 para hashing de passwords
- **2FA TOTP** opcional por utilizador (Google Authenticator / Authy)
- **Rate-limiting** em endpoints sensíveis (auth, register, password reset)
- **Helmet** para headers HTTP seguros
- **CORS** configurável por domínio
- **Validação** com Zod em todos os inputs
- **SQL injection** prevenido por Drizzle ORM (queries parametrizadas)
- **XSS** prevenido por React (escape automático) + CSP headers
- **CSRF** tokens em forms state-changing
- **Audit log** de todas as acções administrativas
- **HTTPS** obrigatório em produção (HSTS)

Reportar vulnerabilidades: ver `SECURITY.md`.

---

## 🤝 Contribuir

Lê [`CONTRIBUTING.md`](packages/docs/CONTRIBUTING.md) antes de submeter PRs.

Convenção de commits: **Conventional Commits**

```
feat: adiciona integração com Softaculous
fix: corrige redirect após login OAuth
docs: actualiza guia de instalação
refactor: simplifica lógica de refresh token
chore: bump dependências
```

---

## 📄 Licença

MIT — veja [`LICENSE`](LICENSE).

---

<p align="center">
  Feito com ❤ pela comunidade CARSAI.<br>
  <strong>Hospedagem gratuita para todos.</strong>
</p>
