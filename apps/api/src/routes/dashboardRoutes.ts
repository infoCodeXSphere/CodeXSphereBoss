import { Router } from "express";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

/**
 * Module 15 — Analytics. Real aggregate queries against the actual
 * data (not mocked numbers) — a genuinely empty database returns
 * genuinely zeroed-out stats rather than pretend sample data, which
 * matters for an internal tool people will actually trust.
 */
dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [totalLeads, byStage, bySource, wonCount, lostCount, revenueAgg, clientCount, overdueInvoices, openTickets] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ["pipelineStage"], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["referralSource"], _count: { _all: true } }),
      prisma.lead.count({ where: { pipelineStage: "WON" } }),
      prisma.lead.count({ where: { pipelineStage: "LOST" } }),
      prisma.lead.aggregate({ _sum: { estimatedRevenue: true }, where: { pipelineStage: "WON" } }),
      prisma.client.count(),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? Number(((wonCount / closedCount) * 100).toFixed(1)) : 0;

    res.json({
      totalLeads,
      leadsByStage: byStage.map((s: { pipelineStage: string; _count: { _all: number } }) => ({ stage: s.pipelineStage, count: s._count._all })),
      leadsBySource: bySource
        .filter((s: { referralSource: string | null; _count: { _all: number } }) => s.referralSource)
        .map((s: { referralSource: string | null; _count: { _all: number } }) => ({ source: s.referralSource, count: s._count._all })),
      wonCount,
      lostCount,
      conversionRate,
      totalWonRevenue: revenueAgg._sum.estimatedRevenue ?? 0,
      clientCount,
      overdueInvoices,
      openTickets,
    });
  })
);
