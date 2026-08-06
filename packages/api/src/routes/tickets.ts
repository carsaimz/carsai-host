/**
 * CARSAI HOST — Tickets routes
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, notFound, forbidden } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTicketSchema, replyTicketSchema, paginationSchema } from '@carsai/shared';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

// ─── GET /tickets ──────────────────────────────────────────────
ticketsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.userId, req.user!.id))
      .orderBy(desc(schema.tickets.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRow = await db
      .select({ count: schema.tickets.id })
      .from(schema.tickets)
      .where(eq(schema.tickets.userId, req.user!.id));
    const total = totalRow.length;

    return ok(res, { tickets: rows, page, limit, total });
  }),
);

// ─── POST /tickets ─────────────────────────────────────────────
ticketsRouter.post(
  '/',
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    const { subject, body, priority, department } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.tickets).values({
      id,
      userId: req.user!.id,
      subject,
      body,
      priority,
      department,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });

    return ok(res, { id, subject, status: 'open' }, 201);
  }),
);

// ─── GET /tickets/:id ──────────────────────────────────────────
ticketsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticketRow = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.id, req.params.id))
      .limit(1);
    const ticket = ticketRow[0];
    if (!ticket) return notFound(res, 'Ticket not found');
    if (ticket.userId !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
      return forbidden(res);
    }

    const replies = await db
      .select()
      .from(schema.ticketReplies)
      .where(eq(schema.ticketReplies.ticketId, ticket.id))
      .orderBy(schema.ticketReplies.createdAt);

    return ok(res, { ...ticket, replies });
  }),
);

// ─── POST /tickets/:id/reply ───────────────────────────────────
ticketsRouter.post(
  '/:id/reply',
  validate(replyTicketSchema),
  asyncHandler(async (req, res) => {
    const { body } = req.body;
    const ticketRow = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.id, req.params.id))
      .limit(1);
    const ticket = ticketRow[0];
    if (!ticket) return notFound(res, 'Ticket not found');
    if (ticket.userId !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
      return forbidden(res);
    }

    const replyId = uuidv4();
    const isStaff = req.user!.role === 'admin' || req.user!.role === 'moderator';
    const now = new Date().toISOString();

    await db.insert(schema.ticketReplies).values({
      id: replyId,
      ticketId: ticket.id,
      userId: req.user!.id,
      body,
      isStaff,
      createdAt: now,
    });

    await db
      .update(schema.tickets)
      .set({
        status: isStaff ? 'pending' : 'open',
        updatedAt: now,
      })
      .where(eq(schema.tickets.id, ticket.id));

    return ok(res, { id: replyId }, 201);
  }),
);
