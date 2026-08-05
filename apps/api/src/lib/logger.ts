/**
 * Deliberately minimal — swap for pino/winston when structured log
 * shipping (Datadog, CloudWatch, etc.) is actually needed. Keeping a
 * single logger module means that swap touches one file, not every
 * route handler.
 */
export const logger = {
  info: (...args: unknown[]) => console.log("[info]", ...args),
  warn: (...args: unknown[]) => console.warn("[warn]", ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
};
