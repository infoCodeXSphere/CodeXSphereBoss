import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { generateQuotationPdf } from "../services/pdfService.js";
import { storage } from "../services/storageService.js";

export const quotationRouter = Router();
quotationRouter.use(requireAuth, requireRole(ROLE_GROUPS.CRM_ACCESS.concat(ROLE_GROUPS.FINANCE_ACCESS)));

quotationRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const quotations = await prisma.quotation.findMany({ orderBy: { createdAt: "desc" }, include: { client: true } });
    res.json(quotations);
  })
);

const createQuotationSchema = z.object({
  clientId: z.string(),
  items: z.array(z.object({ description: z.string(), quantity: z.number().positive(), unitPrice: z.number().nonnegative() })).min(1),
  taxPercent: z.number().min(0).max(100).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  vatNumber: z.string().optional(),
});

// Module 9 — real line-item calculation (subtotal → discount → tax →
// total) plus a downloadable PDF. QR code is documented as a future
// hook in pdfService.ts rather than a fake image.
quotationRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createQuotationSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new ApiError(404, "Client not found");

    const { buffer, total } = await generateQuotationPdf({
      clientName: client.name,
      items: input.items,
      taxPercent: input.taxPercent,
      discountPercent: input.discountPercent,
      vatNumber: input.vatNumber,
    });
    const { url } = await storage.saveFile(buffer, `quotation-${Date.now()}.pdf`);

    const quotation = await prisma.quotation.create({
      data: {
        clientId: input.clientId,
        items: input.items,
        taxPercent: input.taxPercent,
        discountPercent: input.discountPercent,
        vatNumber: input.vatNumber,
        total,
        pdfUrl: url,
      },
    });

    res.status(201).json(quotation);
  })
);
