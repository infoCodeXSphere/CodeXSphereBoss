import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const meetingRouter = Router();
meetingRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

meetingRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const meetings = await prisma.meeting.findMany({ orderBy: { scheduledAt: "asc" }, include: { lead: true, client: true } });
    res.json(meetings);
  })
);

const createMeetingSchema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  scheduledAt: z.coerce.date(),
  attendees: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

meetingRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createMeetingSchema.parse(req.body);
    const meeting = await prisma.meeting.create({ data: input });
    res.status(201).json(meeting);
  })
);

meetingRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = z.object({ status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(), notes: z.string().optional() }).parse(req.body);
    const meeting = await prisma.meeting.update({ where: { id: req.params.id }, data: input });
    res.json(meeting);
  })
);
