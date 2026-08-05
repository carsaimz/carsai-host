/**
 * CARSAI HOST — API entry point
 * Inicia servidor Express com todas as rotas.
 */
import './utils/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './utils/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { publicRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { ticketsRouter } from './routes/tickets.js';
import { blogRouter } from './routes/blog.js';
import { forumRouter } from './routes/forum.js';
import { adminRouter } from './routes/admin.js';

const app = express();

// ─── Security middleware ───────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  }),
);

// ─── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────
app.use(
  morgan(env.isProd ? 'combined' : 'dev', {
    skip: (req) => req.path === '/api/v1/health',
  }),
);

// ─── Global rate limiter ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: env.rateLimit.globalWindowMs,
  max: env.rateLimit.globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' },
  },
});
app.use('/api', globalLimiter);

// ─── Static (uploads) ──────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Routes ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'CARSAI HOST API',
    version: '1.0.0',
    docs: '/api/v1/info',
    health: '/api/v1/health',
  });
});

app.use('/api/v1', publicRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/tickets', ticketsRouter);
app.use('/api/v1/blog', blogRouter);
app.use('/api/v1/forum', forumRouter);
app.use('/api/v1/admin', adminRouter);

// ─── 404 + error handler ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start server ──────────────────────────────────────────────
const port = env.port;
const server = app.listen(port, () => {
  logger.info(`🚀 CARSAI HOST API running on http://localhost:${port}`);
  logger.info(`   Environment: ${env.nodeEnv}`);
  logger.info(`   CORS origins: ${env.cors.origins.join(', ')}`);
  if (!env.mofh.resellerUsername) {
    logger.warn('   ⚠️  MOFH not configured — set MOFH_RESELLER_USERNAME/PASSWORD');
  }
});

// ─── Graceful shutdown ─────────────────────────────────────────
const shutdown = (sig: string) => {
  logger.info(`[${sig}] shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
