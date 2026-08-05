import { Router } from "express";
import rateLimit from "express-rate-limit";
import { publicLeadSchema } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { honeypot } from "../middleware/honeypot.js";
import { analyzeLead } from "../services/leadAnalyzer.js";
import { notifyRoles } from "../services/notificationService.js";
import { logAudit } from "../services/auditService.js";
import { generateEmailDraft } from "../services/emailService.js";
import { env } from "../lib/env.js";

export const publicRouter = Router();

/**
 * This is the literal integration point the brief describes: "Every
 * enquiry submitted from the website must automatically enter the
 * Business Operating System and trigger intelligent workflows."
 *
 * The CodeSphere website's ContactForm.jsx should POST here instead
 * of (or in addition to) its current console.info placeholder — see
 * README.md "Wiring up the website" section for the exact one-line
 * change on the website side.
 *
 * Rate-limited and honeypot-guarded since this is the one endpoint in
 * the whole system that's intentionally open to the public internet
 * with no auth.
 */
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.publicLeadRateLimitPer15Min,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this address. Please try again later." },
});

publicRouter.post(
  "/leads",
  publicLeadLimiter,
  honeypot,
  asyncHandler(async (req, res) => {
    const input = publicLeadSchema.parse(req.body);
    const requirements = input.requirements || input.message || null;

    // --- Automation chain (as specified in the brief) ------------------
    // Website enquiry → Create Lead → AI Analysis → Assign Salesperson →
    // Send Thank You Email (draft) → Create Follow-up Task → Notify Team →
    // Add CRM Record → Track Progress

    const analysis = await analyzeLead({
      budgetRange: input.budgetRange,
      timeline: input.timeline,
      projectType: input.projectType,
      requirements,
      servicesInterested: input.servicesInterested,
      company: input.company,
    });

    // Round-robin assignment across active Sales/BusinessDev users —
    // simplest fair-distribution rule that needs no extra config;
    // swap for a real routing engine (territory, capacity-based, etc.)
    // later without touching anything else in this handler.
    const salesUsers = await prisma.user.findMany({
      where: { role: { in: ["SALES", "BUSINESS_DEV"] }, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const leadCountSoFar = await prisma.lead.count();
    const assignedTo = salesUsers.length > 0 ? salesUsers[leadCountSoFar % salesUsers.length] : null;

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        country: input.country,
        industry: input.industry,
        budgetRange: input.budgetRange,
        timeline: input.timeline,
        projectType: input.projectType,
        servicesInterested: input.servicesInterested,
        requirements,
        referralSource: input.referralSource,
        landingPage: input.landingPage,
        campaignSource: input.campaignSource,
        leadScore: analysis.leadScore,
        priority: analysis.priority,
        estimatedRevenue: analysis.estimatedRevenue ?? undefined,
        assignedToId: assignedTo?.id,
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

    // Thank-you email drafted (not sent) — matches "Admin only reviews
    // and clicks Send" from the brief; stored as an EmailLog row with
    // status DRAFT so it shows up in the assigned rep's queue.
    const draft = generateEmailDraft("THANK_YOU", { leadName: input.name, company: input.company });
    await prisma.emailLog.create({
      data: {
        toEmail: input.email,
        subject: draft.subject,
        body: draft.body,
        templateType: "THANK_YOU",
        status: "DRAFT",
        leadId: lead.id,
      },
    });

    if (assignedTo) {
      await notifyRoles(["SALES", "BUSINESS_DEV", "ADMIN", "SUPER_ADMIN"], {
        type: "NEW_ENQUIRY",
        title: "New website enquiry",
        message: `${input.name}${input.company ? ` (${input.company})` : ""} submitted a new enquiry — priority: ${analysis.priority}.`,
        relatedEntityType: "Lead",
        relatedEntityId: lead.id,
      });
    }

    await logAudit({
      action: "lead.created",
      entityType: "Lead",
      entityId: lead.id,
      leadId: lead.id,
      metadata: { source: "website", referralSource: input.referralSource },
      ipAddress: req.ip,
    });

    // Deliberately return only a success flag + lead reference code,
    // never the internal lead ID or scoring details — this endpoint
    // is public, and a scraper enumerating lead IDs or seeing its own
    // computed lead score is not something to expose.
    res.status(201).json({ success: true, reference: lead.leadCode });
  })
);
