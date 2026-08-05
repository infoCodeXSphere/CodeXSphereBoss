import type { Request, Response, NextFunction } from "express";
import type { Role } from "@cbos/shared";

/**
 * requireRole(["ADMIN", "SALES"]) — must run after requireAuth().
 * Kept as a small factory (not one giant switch) so each route file
 * declares its own access policy inline and it's obvious from reading
 * the route what role(s) can call it, without cross-referencing a
 * separate permissions table.
 */
export function requireRole(allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions for this action" });
    }
    next();
  };
}
