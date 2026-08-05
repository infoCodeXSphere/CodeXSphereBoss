import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { storage } from "../services/storageService.js";

export const documentRouter = Router();
documentRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const metaSchema = z.object({
  type: z.enum(["CONTRACT", "NDA", "PROPOSAL", "QUOTATION", "INVOICE", "DESIGN", "REQUIREMENT", "MEETING_NOTES", "TECHNICAL_DOC", "OTHER"]),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  leadId: z.string().optional(),
});

documentRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file uploaded (expected multipart field 'file')");
    const meta = metaSchema.parse(req.body);

    const { url } = await storage.saveFile(req.file.buffer, req.file.originalname);

    const document = await prisma.document.create({
      data: { ...meta, fileName: req.file.originalname, fileUrl: url, uploadedById: req.user!.sub },
    });

    res.status(201).json(document);
  })
);

documentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId, projectId } = req.query as { clientId?: string; projectId?: string };
    const documents = await prisma.document.findMany({
      where: { ...(clientId ? { clientId } : {}), ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    res.json(documents);
  })
);
