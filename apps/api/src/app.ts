import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "node:path";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { authRouter } from "./routes/authRoutes.js";
import { publicRouter } from "./routes/publicRoutes.js";
import { leadRouter } from "./routes/leadRoutes.js";
import { clientRouter } from "./routes/clientRoutes.js";
import { dashboardRouter } from "./routes/dashboardRoutes.js";
import { notificationRouter } from "./routes/notificationRoutes.js";
import { projectRouter } from "./routes/projectRoutes.js";
import { proposalRouter } from "./routes/proposalRoutes.js";
import { quotationRouter } from "./routes/quotationRoutes.js";
import { invoiceRouter } from "./routes/invoiceRoutes.js";
import { documentRouter } from "./routes/documentRoutes.js";
import { ticketRouter } from "./routes/ticketRoutes.js";
import { meetingRouter } from "./routes/meetingRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { auditLogRouter } from "./routes/auditLogRoutes.js";
import { aiAssistantRouter } from "./routes/aiAssistantRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { communicationRouter } from "./routes/communicationRoutes.js";

export function createApp() {
  const app = express();

  // Behind a reverse proxy in production (Docker/nginx) — needed for
  // express-rate-limit and req.ip to see the real client IP rather
  // than the proxy's.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // required for the httpOnly refresh-token cookie
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  // Locally-stored uploaded files (Module 11). Swaps out automatically
  // once STORAGE_DRIVER=s3 is implemented — see services/storageService.ts.
  app.use("/files", express.static(path.resolve(process.cwd(), "storage")));

  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // Public, unauthenticated — the website integration point.
  app.use("/api/public", publicRouter);

  // Authenticated modules.
  app.use("/api/auth", authRouter);
  app.use("/api/leads", leadRouter);
  app.use("/api/clients", clientRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/proposals", proposalRouter);
  app.use("/api/quotations", quotationRouter);
  app.use("/api/invoices", invoiceRouter);
  app.use("/api/documents", documentRouter);
  app.use("/api/tickets", ticketRouter);
  app.use("/api/meetings", meetingRouter);
  app.use("/api/users", userRouter);
  app.use("/api/audit-logs", auditLogRouter);
  app.use("/api/ai", aiAssistantRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/communications", communicationRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
