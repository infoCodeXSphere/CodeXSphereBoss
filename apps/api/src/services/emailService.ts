import nodemailer from "nodemailer";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import type { EmailTemplateType } from "@prisma/client";

interface EmailContext {
  leadName: string;
  company?: string | null;
  senderName?: string;
  projectType?: string | null;
  meetingDate?: string;
  amount?: string;
  extra?: string;
}

/**
 * Module 3 — AI Email Assistant. Per the brief: "Admin only reviews
 * and clicks Send" — so this generates a draft (subject + body) that
 * a route returns to the frontend for review, and a SEPARATE send
 * step actually dispatches it. Nothing here auto-sends.
 *
 * Templates are plain string interpolation, not an LLM call, by
 * design: email copy needs to be predictable and on-brand every time,
 * not subject to model sampling variance. If ANTHROPIC_API_KEY is
 * configured, callers can optionally pass the generated draft through
 * a polish step (see polishDraftWithAI below) for tone adjustment —
 * the structure and required content stays deterministic either way.
 */
const TEMPLATES: Record<EmailTemplateType, (ctx: EmailContext) => { subject: string; body: string }> = {
  THANK_YOU: (ctx) => ({
    subject: `Thanks for reaching out, ${ctx.leadName}`,
    body: `Hi ${ctx.leadName},\n\nThank you for telling us about your project${ctx.company ? ` at ${ctx.company}` : ""}. We've received your enquiry and someone from our team will follow up within one business day.\n\nIn the meantime, feel free to reply here with any additional details.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  PROPOSAL: (ctx) => ({
    subject: `Your proposal from CodeSphere`,
    body: `Hi ${ctx.leadName},\n\nAttached is our proposal for ${ctx.projectType ?? "your project"}. It covers scope, timeline, and pricing based on what we discussed.\n\nHappy to walk through it on a call if useful — just let us know a time that works.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  MEETING_INVITE: (ctx) => ({
    subject: `Meeting invite — CodeSphere discovery call`,
    body: `Hi ${ctx.leadName},\n\nLet's find time to talk through your project${ctx.meetingDate ? ` — does ${ctx.meetingDate} work on your end?` : "."}\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  QUOTATION_DELIVERY: (ctx) => ({
    subject: `Your quotation from CodeSphere`,
    body: `Hi ${ctx.leadName},\n\nPlease find your quotation attached${ctx.amount ? ` (total: ${ctx.amount})` : ""}. Let us know if you have questions or would like to adjust scope.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  FOLLOW_UP: (ctx) => ({
    subject: `Following up, ${ctx.leadName}`,
    body: `Hi ${ctx.leadName},\n\nJust checking in on your project${ctx.company ? ` at ${ctx.company}` : ""} — still happy to help whenever you're ready. Let me know if anything's changed on your end.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  REMINDER: (ctx) => ({
    subject: `Reminder — action needed`,
    body: `Hi ${ctx.leadName},\n\nThis is a quick reminder regarding ${ctx.extra ?? "your project"}. Let us know if you need anything from our side.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  CONTRACT_REQUEST: (ctx) => ({
    subject: `Contract for signature — CodeSphere`,
    body: `Hi ${ctx.leadName},\n\nAttached is the contract for your project. Please review and let us know if you have any questions before signing.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  PROJECT_UPDATE: (ctx) => ({
    subject: `Project update — ${ctx.projectType ?? "your project"}`,
    body: `Hi ${ctx.leadName},\n\nQuick update on progress: ${ctx.extra ?? "[add current status here]"}.\n\nLet us know if you have questions.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  INVOICE_REMINDER: (ctx) => ({
    subject: `Invoice reminder${ctx.amount ? ` — ${ctx.amount} due` : ""}`,
    body: `Hi ${ctx.leadName},\n\nThis is a friendly reminder that an invoice${ctx.amount ? ` for ${ctx.amount}` : ""} is outstanding. Let us know if you need a copy resent.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  COMPLETION: (ctx) => ({
    subject: `Your project is live 🎉`,
    body: `Hi ${ctx.leadName},\n\nGreat news — your project is now live. Thank you for working with us. We're around for any support you need going forward.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
  SUPPORT_RESPONSE: (ctx) => ({
    subject: `Re: your support request`,
    body: `Hi ${ctx.leadName},\n\nThanks for reaching out. ${ctx.extra ?? "[add response here]"}\n\nLet us know if that resolves things.\n\nBest,\n${ctx.senderName ?? "The CodeSphere Team"}`,
  }),
};

export function generateEmailDraft(type: EmailTemplateType, ctx: EmailContext): { subject: string; body: string } {
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return template(ctx);
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transporter;
}

/**
 * Returns { sent: false, reason: "smtp_not_configured" } instead of
 * throwing when SMTP isn't set up — the draft-review-send UX should
 * degrade gracefully (admin can still copy the draft and send
 * manually) rather than 500 the whole request.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    return { sent: false, reason: "smtp_not_configured" };
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text: body });
    return { sent: true };
  } catch (error) {
    logger.error("Email send failed:", error);
    return { sent: false, reason: "send_failed" };
  }
}
