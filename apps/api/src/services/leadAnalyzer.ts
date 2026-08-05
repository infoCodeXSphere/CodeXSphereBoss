import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { scoreToPriority, type Priority } from "@cbos/shared";

export interface LeadAnalysisInput {
  budgetRange?: string | null;
  timeline?: string | null;
  projectType?: string | null;
  requirements?: string | null;
  servicesInterested?: string[];
  company?: string | null;
}

export interface LeadAnalysisResult {
  leadScore: number;
  priority: Priority;
  estimatedRevenue: number | null;
  complexity: string;
  budgetQuality: string;
  urgency: string;
  clientIntent: string;
  businessValue: string;
  technologyRequirements: string[];
  estimatedDevWeeks: number | null;
  suggestedTeam: string[];
  suggestedNextAction: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number;
  analysisMethod: "heuristic" | "ai";
}

const BUDGET_SCORE: Record<string, number> = {
  "under ₹1,00,000": 1,
  "₹1,00,000 – ₹3,00,000": 2,
  "₹3,00,000 – ₹7,00,000": 3,
  "₹7,00,000+": 4,
  "not sure yet": 0,
};

const URGENCY_SCORE: Record<string, number> = {
  asap: 3,
  "1–3 months": 2,
  "3–6 months": 1,
  "just exploring": 0,
};

const BUDGET_TO_REVENUE_ESTIMATE: Record<string, number> = {
  "under ₹1,00,000": 60000,
  "₹1,00,000 – ₹3,00,000": 200000,
  "₹3,00,000 – ₹7,00,000": 500000,
  "₹7,00,000+": 900000,
};

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Real, working, deterministic lead scoring — this is what runs by
 * default and is what powers Module 1 (auto-assigned lead score /
 * priority) and the bulk of Module 2 (AI Lead Analyzer) without
 * requiring any external API key. It's intentionally simple and
 * auditable: a sales rep can look at a score of "7" and understand
 * exactly why (budget + urgency), rather than trusting an opaque
 * model output.
 */
function heuristicAnalysis(input: LeadAnalysisInput): LeadAnalysisResult {
  const budgetKey = normalize(input.budgetRange);
  const urgencyKey = normalize(input.timeline);

  const budgetScore = BUDGET_SCORE[budgetKey] ?? 0;
  const urgencyScore = URGENCY_SCORE[urgencyKey] ?? 0;
  const leadScore = budgetScore + urgencyScore;

  const requirementsLength = (input.requirements ?? "").length;
  const complexity = requirementsLength > 600 ? "High — multi-module system implied" : requirementsLength > 200 ? "Medium" : "Low — likely single-purpose tool";

  const estimatedDevWeeks = budgetScore >= 4 ? 10 : budgetScore >= 3 ? 6 : budgetScore >= 2 ? 4 : 2;

  const suggestedTeam: string[] = ["Project Manager", "Developer"];
  if (budgetScore >= 3) suggestedTeam.push("UI/UX Designer");
  if (budgetScore >= 4) suggestedTeam.push("QA Engineer");

  const riskLevel: LeadAnalysisResult["riskLevel"] = budgetKey === "not sure yet" && urgencyKey === "asap" ? "HIGH" : budgetScore === 0 ? "MEDIUM" : "LOW";

  const suggestedNextAction =
    leadScore >= 5
      ? "High-value, time-sensitive lead — schedule a discovery call within 24 hours."
      : leadScore >= 3
        ? "Send a scoping questionnaire and propose a discovery call this week."
        : "Add to nurture sequence; re-engage in 2–3 weeks if no response.";

  return {
    leadScore,
    priority: scoreToPriority(leadScore),
    estimatedRevenue: BUDGET_TO_REVENUE_ESTIMATE[budgetKey] ?? null,
    complexity,
    budgetQuality: budgetScore >= 3 ? "Strong" : budgetScore >= 1 ? "Moderate" : "Unqualified / unknown",
    urgency: urgencyKey || "Unspecified",
    clientIntent: requirementsLength > 100 ? "High — detailed requirements provided" : "Low — minimal detail provided, needs qualification",
    businessValue: budgetScore >= 3 ? "High" : budgetScore >= 1 ? "Medium" : "Unclear — qualify before investing sales time",
    technologyRequirements: input.servicesInterested?.length ? input.servicesInterested : ["To be determined during discovery"],
    estimatedDevWeeks,
    suggestedTeam,
    suggestedNextAction,
    riskLevel,
    confidenceScore: budgetKey && urgencyKey ? 0.75 : 0.4, // lower confidence when key fields are missing
    analysisMethod: "heuristic",
  };
}

/**
 * Upgrade path: if ANTHROPIC_API_KEY is set, this calls Claude to
 * produce a richer qualitative read (complexity reasoning, risk
 * narrative) and merges it over the heuristic baseline — the
 * heuristic numbers (leadScore, priority, estimatedRevenue) stay
 * deterministic either way, since those drive pipeline automation and
 * should never silently change based on model sampling variance.
 */
export async function analyzeLead(input: LeadAnalysisInput): Promise<LeadAnalysisResult> {
  const baseline = heuristicAnalysis(input);
  if (!env.anthropicApiKey) {
    return baseline;
  }

  try {
    const prompt = `You are a sales operations analyst for a software development agency. Given this lead, respond ONLY with JSON matching: {"complexity": string, "clientIntent": string, "businessValue": string, "suggestedNextAction": string}.

Lead details:
- Company: ${input.company ?? "unknown"}
- Project type: ${input.projectType ?? "unknown"}
- Budget: ${input.budgetRange ?? "unknown"}
- Timeline: ${input.timeline ?? "unknown"}
- Requirements: ${input.requirements ?? "none provided"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      logger.warn("AI lead analysis call failed, falling back to heuristic:", response.status);
      return baseline;
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) return baseline;

    const parsed = JSON.parse(text) as Partial<Pick<LeadAnalysisResult, "complexity" | "clientIntent" | "businessValue" | "suggestedNextAction">>;

    return { ...baseline, ...parsed, analysisMethod: "ai" };
  } catch (error) {
    logger.warn("AI lead analysis threw, falling back to heuristic:", error);
    return baseline;
  }
}
