import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";

export const projectRouter = Router();
projectRouter.use(requireAuth, requireRole(ROLE_GROUPS.PROJECT_ACCESS.concat(ROLE_GROUPS.CRM_ACCESS)));

projectRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true, company: true } }, _count: { select: { tasks: true, milestones: true } } },
    });
    res.json(projects);
  })
);

projectRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { client: true, tasks: { orderBy: { createdAt: "desc" }, include: { assignee: { select: { id: true, name: true } } } }, milestones: true, documents: true },
    });
    if (!project) throw new ApiError(404, "Project not found");
    res.json(project);
  })
);

const createProjectSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

projectRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({ data: input });
    res.status(201).json(project);
  })
);

const updateProjectSchema = z.object({
  status: z.enum(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  health: z.enum(["GREEN", "YELLOW", "RED"]).optional(),
});

projectRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateProjectSchema.parse(req.body);
    const project = await prisma.project.update({ where: { id: req.params.id }, data: input });
    res.json(project);
  })
);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.coerce.date().optional(),
});

projectRouter.post(
  "/:id/tasks",
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({ data: { ...input, projectId: req.params.id } });
    res.status(201).json(task);
  })
);

const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]).optional(),
  loggedHours: z.number().optional(),
});

projectRouter.patch(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const input = updateTaskSchema.parse(req.body);
    const task = await prisma.task.update({ where: { id: req.params.taskId }, data: input });
    res.json(task);
  })
);

projectRouter.post(
  "/:id/milestones",
  asyncHandler(async (req, res) => {
    const input = z.object({ title: z.string().min(1), dueDate: z.coerce.date().optional() }).parse(req.body);
    const milestone = await prisma.milestone.create({ data: { ...input, projectId: req.params.id } });
    res.status(201).json(milestone);
  })
);
