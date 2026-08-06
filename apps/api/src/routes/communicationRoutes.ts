import { Router } from "express";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const communicationRouter = Router();
communicationRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

/**
 * Module 13 — Communication Center. A unified feed across the two
 * communication-shaped models that already existed (Meeting, EmailLog)
 * but had no combined view. Meetings already have their own full CRUD
 * at /api/meetings; this adds the missing piece — a general-purpose
 * email log listing (previously emails were only reachable scoped to
 * one lead at /api/leads/:id/email-draft) — and merges both into one
 * chronological feed for the Communication Center page.
 */
communicationRouter.get(
  "/feed",
  asyncHandler(async (_req, res) => {
    const [meetings, emails] = await Promise.all([
      prisma.meeting.findMany({
        orderBy: { scheduledAt: "desc" },
        take: 50,
        include: { lead: { select: { name: true } }, client: { select: { name: true } } },
      }),
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { lead: { select: { name: true } }, sentBy: { select: { name: true } } },
      }),
    ]);

    const feed = [
      ...meetings.map((m: (typeof meetings)[number]) => ({
        type: "meeting" as const,
        id: m.id,
        title: `Meeting with ${m.lead?.name ?? m.client?.name ?? "unknown"}`,
        subtitle: m.status,
        timestamp: m.scheduledAt,
      })),
      ...emails.map((e: (typeof emails)[number]) => ({
        type: "email" as const,
        id: e.id,
        title: e.subject,
        subtitle: `${e.status} — to ${e.toEmail}`,
        timestamp: e.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(feed.slice(0, 50));
  })
);
