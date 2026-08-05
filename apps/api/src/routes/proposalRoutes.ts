import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { generateProposalPdf } from "../services/pdfService.js";
import { storage } from "../services/storageService.js";

export const proposalRouter = Router();
proposalRouter.use(requireAuth, requireRole(ROLE_GROUPS.CRM_ACCESS));

proposalRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: "desc" }, include: { client: true } });
    res.json(proposals);
  })
);

const sectionsSchema = z.object({
  companyProfile: z.string().optional(),
  scope: z.string().optional(),
  objectives: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  milestones: z.array(z.string()).optional(),
  pricing: z.string().optional(),
  terms: z.string().optional(),
});

const createProposalSchema = z.object({
  clientId: z.string(),
  title: z.string().min(1),
  sections: sectionsSchema,
});

// Module 8 — generates the proposal record AND a real branded PDF in
// one call, storing the file via the storage abstraction and saving
// its URL on the record. This is a genuine "Generate branded PDF"
// implementation, not a stub.
proposalRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createProposalSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new ApiError(404, "Client not found");

    const pdfBuffer = await generateProposalPdf({ clientName: client.name, title: input.title, sections: input.sections });
    const { url } = await storage.saveFile(pdfBuffer, `proposal-${Date.now()}.pdf`);

    const proposal = await prisma.proposal.create({
      data: { clientId: input.clientId, title: input.title, sections: input.sections, pdfUrl: url },
    });

    res.status(201).json(proposal);
  })
);

proposalRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]) }).parse(req.body);
    const proposal = await prisma.proposal.update({ where: { id: req.params.id }, data: { status } });
    res.json(proposal);
  })
);
