import { prisma } from "../lib/prisma.js";
import type { NotificationType, Role } from "@prisma/client";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function notifyUser(input: NotifyInput) {
  return prisma.notification.create({ data: input });
}

/**
 * Used for "notify the team" style automations (e.g. a new enquiry
 * notifies everyone in Sales, not one specific person) — Module 14 +
 * the automation flow at the top of the brief ("Notify Team").
 */
export async function notifyRoles(roles: Role[], payload: Omit<NotifyInput, "userId">) {
  const users = await prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u: { id: string }) => ({ ...payload, userId: u.id })),
  });
}
