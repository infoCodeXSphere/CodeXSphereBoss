import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Centralized error handler — every route funnels thrown errors here
 * via Express's next(err) or an uncaught throw inside an async handler
 * wrapped by asyncHandler(). Prevents leaking stack traces or raw
 * Prisma error messages (which can reveal schema details) to clients
 * in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  logger.error("Unhandled error:", err);
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : String(err);
  return res.status(500).json({ error: message });
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
