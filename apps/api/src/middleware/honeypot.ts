import type { Request, Response, NextFunction } from "express";

/**
 * Cheap, dependency-free spam mitigation for the public lead-intake
 * endpoint: the real website form includes a `website` field that's
 * hidden via CSS and left blank by real users. Bots that indiscrimin-
 * ately fill every field trip this and get a fake-success response
 * (200, not 4xx — telling a bot "rejected" just teaches it to adapt).
 */
export function honeypot(req: Request, res: Response, next: NextFunction) {
  if (req.body?.website) {
    return res.status(200).json({ success: true }); // silently drop
  }
  next();
}
