import { prisma } from "../lib/prisma.js";

interface AuditEntry {
  userId?: string | null;
  leadId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Fire-and-forget audit logging — failures here are logged but never
 * block or fail the calling request. An audit trail is important, but
 * it should never be the reason a real user-facing action (like
 * creating a lead) fails.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        leadId: entry.leadId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log:", error);
  }
}
