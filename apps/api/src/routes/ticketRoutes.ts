import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { notifyRoles } from "../services/notificationService.js";

export const ticketRouter = Router();
ticketRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

ticketRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, include: { client: true, assignedTo: { select: { id: true, name: true } } } });
    res.json(tickets);
  })
);

const createTicketSchema = z.object({
  clientId: z.string(),
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

ticketRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse(req.body);
    const ticket = await prisma.supportTicket.create({ data: input });
    await notifyRoles(["SUPPORT", "ADMIN", "SUPER_ADMIN"], {
      type: "SUPPORT_TICKET",
      title: "New support ticket",
      message: ticket.subject,
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
    });
    res.status(201).json(ticket);
  })
);

const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"]).optional(),
  assignedToId: z.string().optional(),
});

ticketRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateTicketSchema.parse(req.body);
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: input });
    res.json(ticket);
  })
);
