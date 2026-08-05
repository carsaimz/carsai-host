/**
 * CARSAI HOST — Forum routes (public read, auth write)
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden, fail } from '../utils/response.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTopicSchema, createReplySchema } from '@carsai/shared';

export const forumRouter = Router();

// ─── GET /forum/categories ─────────────────────────────────────
forumRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const cats = await db
      .select()
      .from(schema.forumCategories)
      .orderBy(schema.forumCategories.order);
    return ok(res, cats);
  }),
);

// ─── GET /forum/categories/:slug/topics ────────────────────────
forumRouter.get(
  '/categories/:slug/topics',
  asyncHandler(async (req, res) => {
    const catRow = await db
      .select()
      .from(schema.forumCategories)
      .where(eq(schema.forumCategories.slug, req.params.slug))
      .limit(1);
    const cat = catRow[0];
    if (!cat) return notFound(res, 'Category not found');

    const topics = await db
      .select()
      .from(schema.forumTopics)
      .where(eq(schema.forumTopics.categoryId, cat.id))
      .orderBy(desc(schema.forumTopics.pinned), desc(schema.forumTopics.lastReplyAt));

    return ok(res, topics);
  }),
);

// ─── GET /forum/topics/:id ─────────────────────────────────────
forumRouter.get(
  '/topics/:id',
  asyncHandler(async (req, res) => {
    const topicRow = await db
      .select()
      .from(schema.forumTopics)
      .where(eq(schema.forumTopics.id, req.params.id))
      .limit(1);
    const topic = topicRow[0];
    if (!topic) return notFound(res, 'Topic not found');

    const replies = await db
      .select()
      .from(schema.forumReplies)
      .where(eq(schema.forumReplies.topicId, topic.id))
      .orderBy(schema.forumReplies.createdAt);

    // Increment views
    await db
      .update(schema.forumTopics)
      .set({ views: topic.views + 1 })
      .where(eq(schema.forumTopics.id, topic.id));

    return ok(res, { ...topic, replies });
  }),
);

// ─── POST /forum/topics (auth required) ────────────────────────
forumRouter.post(
  '/topics',
  requireAuth,
  validate(createTopicSchema),
  asyncHandler(async (req, res) => {
    const { categoryId, title, body } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.forumTopics).values({
      id,
      categoryId,
      userId: req.user!.id,
      title,
      body,
      pinned: false,
      locked: false,
      views: 0,
      lastReplyAt: now,
      createdAt: now,
    });

    return ok(res, { id }, 201);
  }),
);

// ─── POST /forum/topics/:id/replies (auth) ─────────────────────
forumRouter.post(
  '/topics/:id/replies',
  requireAuth,
  validate(createReplySchema),
  asyncHandler(async (req, res) => {
    const { body } = req.body;
    const topicRow = await db
      .select()
      .from(schema.forumTopics)
      .where(eq(schema.forumTopics.id, req.params.id))
      .limit(1);
    const topic = topicRow[0];
    if (!topic) return notFound(res, 'Topic not found');
    if (topic.locked) return fail(res, 'TOPIC_LOCKED', 'Topic is locked', 403);

    const id = uuidv4();
    const now = new Date().toISOString();
    await db.insert(schema.forumReplies).values({
      id,
      topicId: topic.id,
      userId: req.user!.id,
      body,
      createdAt: now,
    });

    await db
      .update(schema.forumTopics)
      .set({ lastReplyAt: now })
      .where(eq(schema.forumTopics.id, topic.id));

    return ok(res, { id }, 201);
  }),
);
