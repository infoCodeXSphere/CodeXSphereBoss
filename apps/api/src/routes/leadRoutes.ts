import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS, updateLeadStageSchema, createManualLeadSchema } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { analyzeLead } from "../services/leadAnalyzer.js";
import { logAudit } from "../services/auditService.js";
import { notifyUser } from "../services/notificationService.js";
import type { PipelineStage, EmailTemplateType } from "@prisma/client";
import { generateEmailDraft, sendEmail } from "../services/emailService.js";

export const leadRouter = Router();
leadRouter.use(requireAuth, requireRole(ROLE_GROUPS.CRM_ACCESS));

const listQuerySchema = z.object({
  stage: z.string().optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

leadRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const where = {
      ...(query.stage ? { pipelineStage: query.stage as PipelineStage } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { company: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ items, total, page: query.page, pageSize: query.pageSize });
  })
);

// Grouped-by-stage shape purpose-built for the Kanban board, so the
// frontend doesn't have to fetch all leads and group client-side.
leadRouter.get(
  "/pipeline",
  asyncHandler(async (_req, res) => {
    const leads = await prisma.lead.findMany({
      where: { pipelineStage: { notIn: ["ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    const grouped: Record<string, typeof leads> = {};
    for (const lead of leads) {
      grouped[lead.pipelineStage] ??= [];
      grouped[lead.pipelineStage].push(lead);
    }
    res.json(grouped);
  })
);

leadRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        emailLogs: { orderBy: { createdAt: "desc" } },
        meetings: { orderBy: { scheduledAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!lead) throw new ApiError(404, "Lead not found");
    res.json(lead);
  })
);

leadRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createManualLeadSchema.parse(req.body);
    const analysis = await analyzeLead(input);

    const lead = await prisma.lead.create({
      data: {
        ...input,
        estimatedRevenue: analysis.estimatedRevenue ?? undefined,
        leadScore: analysis.leadScore,
        priority: analysis.priority,
        complexity: analysis.complexity,
        budgetQuality: analysis.budgetQuality,
        urgency: analysis.urgency,
        clientIntent: analysis.clientIntent,
        businessValue: analysis.businessValue,
        technologyRequirements: analysis.technologyRequirements,
        estimatedDevWeeks: analysis.estimatedDevWeeks,
        suggestedTeam: analysis.suggestedTeam,
        suggestedNextAction: analysis.suggestedNextAction,
        riskLevel: analysis.riskLevel,
        confidenceScore: analysis.confidenceScore,
      },
    });

    await logAudit({ userId: req.user!.sub, action: "lead.created_manual", entityType: "Lead", entityId: lead.id, leadId: lead.id });
    res.status(201).json(lead);
  })
);

leadRouter.patch(
  "/:id/stage",
  asyncHandler(async (req, res) => {
    const { pipelineStage } = updateLeadStageSchema.parse(req.body);
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { pipelineStage: pipelineStage as PipelineStage },
    });

    await logAudit({
      userId: req.user!.sub,
      action: "lead.stage_changed",
      entityType: "Lead",
      entityId: lead.id,
      leadId: lead.id,
      metadata: { newStage: pipelineStage },
    });

    if (pipelineStage === "WON" && lead.assignedToId) {
      await notifyUser({
        userId: lead.assignedToId,
        type: "SYSTEM",
        title: "Deal won 🎉",
        message: `${lead.name} moved to Won.`,
        relatedEntityType: "Lead",
        relatedEntityId: lead.id,
      });
    }

    res.json(lead);
  })
);

leadRouter.patch(
  "/:id/assign",
  requireRole(ROLE_GROUPS.ADMIN_ONLY.concat(ROLE_GROUPS.CRM_ACCESS)),
  asyncHandler(async (req, res) => {
    const { assignedToId } = z.object({ assignedToId: z.string() }).parse(req.body);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { assignedToId } });
    await notifyUser({
      userId: assignedToId,
      type: "TASK_ASSIGNED",
      title: "Lead assigned to you",
      message: `${lead.name} has been assigned to you.`,
      relatedEntityType: "Lead",
      relatedEntityId: lead.id,
    });
    res.json(lead);
  })
);

// Module 1 → Module 5: converting a qualified lead into a Client
// record is the hinge point between the CRM and every downstream
// module (Projects, Invoices, Documents all key off Client, not Lead).
leadRouter.post(
  "/:id/convert-to-client",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) throw new ApiError(404, "Lead not found");

    const existing = await prisma.client.findUnique({ where: { leadId: lead.id } });
    if (existing) throw new ApiError(409, "This lead has already been converted to a client");

    const client = await prisma.client.create({
      data: {
        leadId: lead.id,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        country: lead.country,
      },
    });

    await prisma.lead.update({ where: { id: lead.id }, data: { pipelineStage: "WON" } });
    await logAudit({ userId: req.user!.sub, action: "lead.converted_to_client", entityType: "Client", entityId: client.id, leadId: lead.id });

    res.status(201).json(client);
  })
);

// Module 3 — AI Email Assistant, scoped to a specific lead: generate
// a draft, then a separate confirm step actually sends it.
const emailDraftSchema = z.object({
  templateType: z.string(),
  extra: z.string().optional(),
});

leadRouter.post(
  "/:id/email-draft",
  asyncHandler(async (req, res) => {
    const { templateType, extra } = emailDraftSchema.parse(req.body);
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) throw new ApiError(404, "Lead not found");

    const draft = generateEmailDraft(templateType as EmailTemplateType, {
      leadName: lead.name,
      company: lead.company,
      projectType: lead.projectType,
      extra,
    });

    const emailLog = await prisma.emailLog.create({
      data: {
        toEmail: lead.email,
        subject: draft.subject,
        body: draft.body,
        templateType: templateType as EmailTemplateType,
        status: "DRAFT",
        leadId: lead.id,
        sentById: req.user!.sub,
      },
    });

    res.status(201).json(emailLog);
  })
);

leadRouter.post(
  "/email-logs/:emailLogId/send",
  asyncHandler(async (req, res) => {
    const emailLog = await prisma.emailLog.findUnique({ where: { id: req.params.emailLogId } });
    if (!emailLog) throw new ApiError(404, "Email draft not found");
    if (emailLog.status === "SENT") throw new ApiError(409, "This email has already been sent");

    const result = await sendEmail(emailLog.toEmail, emailLog.subject, emailLog.body);

    const updated = await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: result.sent ? { status: "SENT", sentAt: new Date(), sentById: req.user!.sub } : {},
    });

    await logAudit({ userId: req.user!.sub, action: "email.send_attempted", entityType: "EmailLog", entityId: emailLog.id, metadata: { result } });

    res.json({ ...updated, sendResult: result });
  })
);
