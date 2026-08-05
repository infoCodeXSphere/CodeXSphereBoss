import { Router } from "express";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const auditLogRouter = Router();
auditLogRouter.use(requireAuth, requireRole(ROLE_GROUPS.ADMIN_ONLY));

auditLogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(logs);
  })
);
