// Shared between apps/api and apps/web so the two never drift out of
// sync on role names, pipeline stages, or the public lead payload
// shape. The backend re-validates everything server-side regardless
// (never trust client validation alone) — this package just means
// both sides describe the same shape once.

import { z } from "zod";

// ---------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "BUSINESS_DEV",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "DESIGNER",
  "QA",
  "FINANCE",
  "SUPPORT",
  "CLIENT",
  "GUEST",
] as const;

export type Role = (typeof ROLES)[number];

// Coarse-grained permission groups. Route middleware checks against
// these rather than hardcoding role lists inline at every route, so
// adding a new role later means updating this map in one place.
export const ROLE_GROUPS = {
  INTERNAL_STAFF: ["SUPER_ADMIN", "ADMIN", "SALES", "BUSINESS_DEV", "PROJECT_MANAGER", "DEVELOPER", "DESIGNER", "QA", "FINANCE", "SUPPORT"] as Role[],
  CRM_ACCESS: ["SUPER_ADMIN", "ADMIN", "SALES", "BUSINESS_DEV"] as Role[],
  PROJECT_ACCESS: ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "DEVELOPER", "DESIGNER", "QA"] as Role[],
  FINANCE_ACCESS: ["SUPER_ADMIN", "ADMIN", "FINANCE"] as Role[],
  ADMIN_ONLY: ["SUPER_ADMIN", "ADMIN"] as Role[],
  CLIENT_PORTAL: ["CLIENT"] as Role[],
};

// ---------------------------------------------------------------
// Sales pipeline
// ---------------------------------------------------------------

export const PIPELINE_STAGES = [
  "NEW_LEAD",
  "QUALIFIED",
  "DISCOVERY_CALL",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  NEW_LEAD: "New Lead",
  QUALIFIED: "Qualified",
  DISCOVERY_CALL: "Discovery Call",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

// ---------------------------------------------------------------
// Public lead intake — the contract between the marketing website's
// contact form and POST /api/public/leads. Keep this in sync with
// apps/web contact form fields on the marketing site.
// ---------------------------------------------------------------

export const publicLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().max(200).optional(),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  budgetRange: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  projectType: z.string().max(200).optional(),
  servicesInterested: z.array(z.string()).optional().default([]),
  requirements: z.string().max(5000).optional(),
  referralSource: z.string().max(200).optional(),
  landingPage: z.string().max(500).optional(),
  campaignSource: z.string().max(200).optional(),
  message: z.string().max(5000).optional(), // maps into `requirements` if requirements is empty
  // Honeypot field — a hidden input the real website form leaves
  // blank; bots that fill every field trip this and get silently
  // rejected. See middleware/honeypot.ts.
  website: z.string().max(0).optional(),
});

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateLeadStageSchema = z.object({
  pipelineStage: z.enum(PIPELINE_STAGES),
});

export const createManualLeadSchema = publicLeadSchema.extend({
  assignedToId: z.string().optional(),
});

// ---------------------------------------------------------------
// Lead scoring — shared so the same thresholds are documented once
// and the frontend can render a matching badge without re-deriving
// the mapping from raw numbers.
// ---------------------------------------------------------------

export function scoreToPriority(score: number): Priority {
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}
