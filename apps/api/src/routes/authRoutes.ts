import { Router } from "express";
import { loginSchema } from "@cbos/shared";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/authService.js";
import { logAudit } from "../services/auditService.js";

export const authRouter = Router();

const REFRESH_COOKIE = "cbos_refresh_token";
const isProd = process.env.NODE_ENV === "production";

/**
 * The dashboard (e.g. elegant-peace-....railway.app) and the API
 * (e.g. codexsphereboss-....railway.app) are deployed on two
 * different Railway subdomains — different origins, from the
 * browser's point of view. A cookie set with `sameSite: "lax"` is
 * only ever sent back on same-site requests or top-level navigations
 * — a background fetch() from the dashboard's JS to the API's
 * /auth/refresh endpoint is neither, so the browser silently drops
 * the cookie. That's why a page reload (or reconnecting after the
 * tab was closed) previously bounced straight to the login screen
 * instead of restoring the session: the refresh call was firing, but
 * arriving with no cookie attached, every single time.
 *
 * `sameSite: "none"` explicitly allows the cookie on cross-site
 * requests. Browsers require `secure: true` alongside it — Railway
 * serves everything over HTTPS in production, so that's satisfied;
 * locally in dev, the Vite proxy makes frontend and API same-origin
 * anyway, so "lax" still works there.
 */
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  path: "/api/auth",
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = await issueRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    await logAudit({ userId: user.id, action: "user.login", entityType: "User", entityId: user.id, ipAddress: req.ip });

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, "No refresh token provided");

    const rotated = await rotateRefreshToken(token);
    if (!rotated) throw new ApiError(401, "Refresh token expired or revoked");

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || !user.isActive) throw new ApiError(401, "Account no longer active");

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

    res.cookie(REFRESH_COOKIE, rotated.newRaw, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ accessToken });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await revokeRefreshToken(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ success: true });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  })
);

// Admin-only user creation lives here rather than a public register
// endpoint — CBOS is an internal tool, not a public sign-up product.
// The seed script creates the first SUPER_ADMIN; that account then
// creates everyone else via POST /api/users (see userRoutes.ts).
