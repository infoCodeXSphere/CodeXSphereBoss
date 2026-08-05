import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { notifyRoles } from "../services/notificationService.js";

export const invoiceRouter = Router();
invoiceRouter.use(requireAuth, requireRole(ROLE_GROUPS.FINANCE_ACCESS.concat(ROLE_GROUPS.CRM_ACCESS)));

invoiceRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { client: true, project: true } });
    res.json(invoices);
  })
);

const createInvoiceSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  items: z.array(z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number() })).min(1),
  dueDate: z.coerce.date().optional(),
});

invoiceRouter.post(
  "/",
  requireRole(ROLE_GROUPS.FINANCE_ACCESS),
  asyncHandler(async (req, res) => {
    const input = createInvoiceSchema.parse(req.body);
    const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const invoice = await prisma.invoice.create({ data: { ...input, total } });
    res.status(201).json(invoice);
  })
);

const updateStatusSchema = z.object({ status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]) });

invoiceRouter.patch(
  "/:id/status",
  requireRole(ROLE_GROUPS.FINANCE_ACCESS),
  asyncHandler(async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status, paidAt: status === "PAID" ? new Date() : undefined },
    });

    if (status === "OVERDUE") {
      await notifyRoles(["FINANCE", "ADMIN", "SUPER_ADMIN"], {
        type: "INVOICE_OVERDUE",
        title: "Invoice overdue",
        message: `Invoice ${invoice.id} is now overdue.`,
        relatedEntityType: "Invoice",
        relatedEntityId: invoice.id,
      });
    }

    res.json(invoice);
  })
);

// Real financial summary — payment gateway integration itself
// (Module 10's "Pay invoices, future-ready") is out of scope without
// a real Stripe/Razorpay account to test against, but the dashboard
// numbers driven by this data are real, not mocked.
invoiceRouter.get(
  "/summary/financials",
  requireRole(ROLE_GROUPS.FINANCE_ACCESS),
  asyncHandler(async (_req, res) => {
    const [paid, outstanding, overdue] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { in: ["SENT", "DRAFT"] } } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "OVERDUE" } }),
    ]);
    res.json({
      totalPaid: paid._sum.total ?? 0,
      totalOutstanding: outstanding._sum.total ?? 0,
      totalOverdue: overdue._sum.total ?? 0,
    });
  })
);
