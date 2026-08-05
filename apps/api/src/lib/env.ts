import "dotenv/config";

// Fail fast and loudly if required secrets are missing, instead of
// booting with an undefined JWT secret (a classic silent-vulnerability
// footgun) or a database URL that resolves to nothing.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY ?? "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? "7d",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim()),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || null,
    password: process.env.SMTP_PASSWORD || null,
    from: process.env.SMTP_FROM || "CodeSphere <no-reply@codesphere.dev>",
  },
  storageDriver: (process.env.STORAGE_DRIVER as "local" | "supabase") ?? "local",
  supabase: {
    url: process.env.SUPABASE_URL || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "cbos-documents",
  },
  publicLeadRateLimitPer15Min: Number(process.env.PUBLIC_LEAD_RATE_LIMIT_PER_15MIN ?? 20),
};
