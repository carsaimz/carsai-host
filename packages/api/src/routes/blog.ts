/**
 * CARSAI HOST — Blog routes (public read, admin write)
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound } from '../utils/response.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPostSchema } from '@carsai/shared';

export const blogRouter = Router();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── GET /blog/posts (public) ─────────────────────────────────
blogRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const { category, tag, limit = '20', page = '1' } = req.query;
    const lim = Math.min(parseInt(limit as string, 10) || 20, 100);
    const off = (parseInt(page as string, 10) || 1 - 1) * lim;

    let q = db
      .select({
        id: schema.blogPosts.id,
        slug: schema.blogPosts.slug,
        title: schema.blogPosts.title,
        excerpt: schema.blogPosts.excerpt,
        coverImage: schema.blogPosts.coverImage,
        authorId: schema.blogPosts.authorId,
        category: schema.blogPosts.category,
        tags: schema.blogPosts.tags,
        views: schema.blogPosts.views,
        publishedAt: schema.blogPosts.publishedAt,
        createdAt: schema.blogPosts.createdAt,
      })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.status, 'published'))
      .orderBy(desc(schema.blogPosts.publishedAt))
      .limit(lim)
      .offset(Math.max(0, off));

    const posts = await q;
    return ok(res, posts);
  }),
);

// ─── GET /blog/posts/:slug (public) ───────────────────────────
blogRouter.get(
  '/posts/:slug',
  asyncHandler(async (req, res) => {
    const row = await db
      .select()
      .from(schema.blogPosts)
      .where(
        and(
          eq(schema.blogPosts.slug, req.params.slug),
          eq(schema.blogPosts.status, 'published'),
        ),
      )
      .limit(1);

    const post = row[0];
    if (!post) return notFound(res, 'Post not found');

    // Increment views (fire and forget)
    await db
      .update(schema.blogPosts)
      .set({ views: post.views + 1 })
      .where(eq(schema.blogPosts.id, post.id));

    return ok(res, post);
  }),
);

// ─── POST /blog/posts (admin only) ────────────────────────────
blogRouter.post(
  '/posts',
  requireAdmin,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const { title, excerpt, content, coverImage, category, tags, status } = req.body;
    const id = uuidv4();
    const slug = slugify(title) + '-' + id.slice(0, 6);
    const now = new Date().toISOString();

    await db.insert(schema.blogPosts).values({
      id,
      slug,
      title,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      authorId: req.user!.id,
      category,
      tags: JSON.stringify(tags || []),
      status,
      views: 0,
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    return ok(res, { id, slug }, 201);
  }),
);

// ─── PUT /blog/posts/:id (admin only) ─────────────────────────
blogRouter.put(
  '/posts/:id',
  requireAdmin,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const { title, excerpt, content, coverImage, category, tags, status } = req.body;
    const now = new Date().toISOString();

    await db
      .update(schema.blogPosts)
      .set({
        title,
        excerpt: excerpt || null,
        content,
        coverImage: coverImage || null,
        category,
        tags: JSON.stringify(tags || []),
        status,
        publishedAt: status === 'published' ? now : null,
        updatedAt: now,
      })
      .where(eq(schema.blogPosts.id, req.params.id));

    return ok(res, { updated: true });
  }),
);

// ─── DELETE /blog/posts/:id (admin only) ──────────────────────
blogRouter.delete(
  '/posts/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await db
      .delete(schema.blogPosts)
      .where(eq(schema.blogPosts.id, req.params.id));
    return ok(res, { deleted: true });
  }),
);
