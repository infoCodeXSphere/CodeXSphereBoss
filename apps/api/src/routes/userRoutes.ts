import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS, ROLES } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { hashPassword } from "../services/authService.js";
import { logAudit } from "../services/auditService.js";

export const userRouter = Router();
userRouter.use(requireAuth, requireRole(ROLE_GROUPS.ADMIN_ONLY));

userRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  })
);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
});

userRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError(409, "A user with this email already exists");

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await logAudit({ userId: req.user!.sub, action: "user.created", entityType: "User", entityId: user.id, metadata: { role: input.role } });
    res.status(201).json(user);
  })
);

userRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = z.object({ role: z.enum(ROLES).optional(), isActive: z.boolean().optional() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: input,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json(user);
  })
);
