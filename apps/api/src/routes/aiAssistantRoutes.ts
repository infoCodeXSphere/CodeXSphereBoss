import { Router } from "express";
import { z } from "zod";
import { ROLE_GROUPS } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";

export const aiAssistantRouter = Router();
aiAssistantRouter.use(requireAuth, requireRole(ROLE_GROUPS.INTERNAL_STAFF));

/**
 * Module 12 — AI Business Assistant. Rather than faking "natural
 * language understanding" with a keyword-matcher pretending to be AI,
 * this does the honest version of both halves:
 *
 * 1. A small set of common questions (matching the brief's own
 *    examples almost verbatim) are answered with REAL data via
 *    simple, transparent intent matching — "Show today's enquiries"
 *    genuinely queries today's leads; it doesn't hallucinate a
 *    plausible-sounding answer.
 * 2. Anything outside that set, IF an API key is configured, is
 *    handed to Claude with the relevant data pre-fetched and included
 *    in the prompt (so the model answers from real numbers, not
 *    invented ones). Without a key, it says so plainly instead of
 *    pretending to answer — see the final `else` branch below.
 */

const askSchema = z.object({ question: z.string().min(1).max(500) });

async function todaysEnquiries() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const leads = await prisma.lead.findMany({ where: { createdAt: { gte: startOfDay } }, orderBy: { createdAt: "desc" } });
  return { answer: `${leads.length} enquiries today.`, data: leads };
}

async function pendingProposals() {
  const proposals = await prisma.proposal.findMany({ where: { status: { in: ["DRAFT", "SENT"] } }, include: { client: true } });
  return { answer: `${proposals.length} proposals are pending (draft or sent, not yet accepted/rejected).`, data: proposals };
}

async function delayedProjects() {
  const projects = await prisma.project.findMany({ where: { health: { in: ["YELLOW", "RED"] }, status: { notIn: ["COMPLETED", "CANCELLED"] } }, include: { client: true } });
  return { answer: `${projects.length} active projects are flagged Yellow or Red health.`, data: projects };
}

async function monthlyRevenue() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const result = await prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID", paidAt: { gte: startOfMonth } } });
  return { answer: `Revenue collected this month: ${result._sum.total ?? 0}.`, data: result };
}

// Intent patterns, checked in order — first match wins. Each maps a
// family of phrasings to one of the real-data handlers above.
const INTENTS: Array<{ pattern: RegExp; handler: () => Promise<{ answer: string; data: unknown }> }> = [
  { pattern: /today.*enquir|enquir.*today/i, handler: todaysEnquiries },
  { pattern: /proposal.*pending|pending.*proposal/i, handler: pendingProposals },
  { pattern: /project.*delay|delay.*project/i, handler: delayedProjects },
  { pattern: /monthly revenue|revenue.*month/i, handler: monthlyRevenue },
];

aiAssistantRouter.post(
  "/ask",
  asyncHandler(async (req, res) => {
    const { question } = askSchema.parse(req.body);

    const matched = INTENTS.find((intent) => intent.pattern.test(question));
    if (matched) {
      const result = await matched.handler();
      return res.json({ ...result, method: "direct-query" });
    }

    if (!env.anthropicApiKey) {
      return res.json({
        answer:
          "I can answer a few specific questions directly right now (today's enquiries, pending proposals, delayed projects, monthly revenue). For open-ended questions, an administrator needs to set ANTHROPIC_API_KEY in the environment to enable general AI responses.",
        method: "unsupported",
      });
    }

    try {
      // Give the model a small amount of real, current context so it
      // isn't answering from nothing — still explicitly scoped, not a
      // free-form "let the model query the database" agent (which
      // would need its own careful sandboxing this MVP doesn't have).
      const [leadCount, clientCount, openTickets] = await Promise.all([
        prisma.lead.count(),
        prisma.client.count(),
        prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      ]);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.anthropicApiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `You are an internal business assistant for a software agency's CRM. Current stats: ${leadCount} total leads, ${clientCount} clients, ${openTickets} open support tickets. Answer this staff question concisely, using only the stats given if relevant — do not invent numbers you weren't given: "${question}"`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((b) => b.type === "text")?.text ?? "No response generated.";
      res.json({ answer: text, method: "ai" });
    } catch (error) {
      logger.warn("AI business assistant call failed:", error);
      res.json({ answer: "The AI assistant is temporarily unavailable. Please try one of the supported direct questions instead.", method: "error" });
    }
  })
);
