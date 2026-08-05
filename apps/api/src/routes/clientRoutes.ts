import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";

export const clientRouter = Router();
clientRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

clientRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true, invoices: true, supportTickets: true } } },
    });
    res.json(clients);
  })
);

clientRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        projects: true,
        invoices: { orderBy: { createdAt: "desc" } },
        proposals: { orderBy: { createdAt: "desc" } },
        quotations: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
        supportTickets: { orderBy: { createdAt: "desc" } },
        meetings: { orderBy: { scheduledAt: "desc" } },
        lead: true,
      },
    });
    if (!client) throw new ApiError(404, "Client not found");
    res.json(client);
  })
);

const createClientSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
});

clientRouter.post(
  "/",
  requireRole(ROLE_GROUPS.ADMIN_ONLY.concat(ROLE_GROUPS.CRM_ACCESS)),
  asyncHandler(async (req, res) => {
    const input = createClientSchema.parse(req.body);
    const client = await prisma.client.create({ data: input });
    res.status(201).json(client);
  })
);
