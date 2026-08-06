import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logAudit } from "../services/auditService.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(ROLE_GROUPS.ADMIN_ONLY));

/**
 * Module 16 — Admin Panel. Manages the configurable lookups
 * (ServiceOffering, IndustryOption) that the website's contact form
 * and CRM dropdowns should eventually read from instead of being
 * hardcoded — swapping a hardcoded list for this API is a follow-up
 * integration task on the website side, not something this route
 * needs to know about.
 */

adminRouter.get(
  "/services",
  asyncHandler(async (_req, res) => {
    const services = await prisma.serviceOffering.findMany({ orderBy: { name: "asc" } });
    res.json(services);
  })
);

const serviceSchema = z.object({ name: z.string().min(1), description: z.string().optional() });

adminRouter.post(
  "/services",
  asyncHandler(async (req, res) => {
    const input = serviceSchema.parse(req.body);
    const service = await prisma.serviceOffering.create({ data: input });
    await logAudit({ userId: req.user!.sub, action: "service.created", entityType: "ServiceOffering", entityId: service.id });
    res.status(201).json(service);
  })
);

adminRouter.patch(
  "/services/:id",
  asyncHandler(async (req, res) => {
    const input = z.object({ isActive: z.boolean().optional(), name: z.string().optional(), description: z.string().optional() }).parse(req.body);
    const service = await prisma.serviceOffering.update({ where: { id: req.params.id }, data: input });
    res.json(service);
  })
);

adminRouter.delete(
  "/services/:id",
  asyncHandler(async (req, res) => {
    await prisma.serviceOffering.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

adminRouter.get(
  "/industries",
  asyncHandler(async (_req, res) => {
    const industries = await prisma.industryOption.findMany({ orderBy: { name: "asc" } });
    res.json(industries);
  })
);

const industrySchema = z.object({ name: z.string().min(1) });

adminRouter.post(
  "/industries",
  asyncHandler(async (req, res) => {
    const input = industrySchema.parse(req.body);
    const industry = await prisma.industryOption.create({ data: input });
    await logAudit({ userId: req.user!.sub, action: "industry.created", entityType: "IndustryOption", entityId: industry.id });
    res.status(201).json(industry);
  })
);

adminRouter.patch(
  "/industries/:id",
  asyncHandler(async (req, res) => {
    const input = z.object({ isActive: z.boolean().optional(), name: z.string().optional() }).parse(req.body);
    const industry = await prisma.industryOption.update({ where: { id: req.params.id }, data: input });
    res.json(industry);
  })
);

adminRouter.delete(
  "/industries/:id",
  asyncHandler(async (req, res) => {
    await prisma.industryOption.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
