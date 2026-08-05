import { useLocation } from "react-router-dom";

const API_ONLY_MODULES = ["projects", "proposals", "quotations", "invoices", "documents", "tickets", "analytics"];

/**
 * Shown for modules that don't have a dedicated frontend page yet.
 * Distinguishes two honest states:
 * - "API is live, UI isn't built" (Projects, Proposals, Quotations,
 *   Invoices, Documents, Tickets, Analytics) — the backend routes in
 *   apps/api/src/routes/ are real and callable today.
 * - "Neither API nor UI exist yet" (Communication Center, Admin
 *   Panel) — only the database schema anticipates these.
 */
export function ModulePlaceholderPage() {
  const location = useLocation();
  const slug = location.pathname.replace("/", "");
  const moduleName = slug.replace(/-/g, " ");
  const isApiOnly = API_ONLY_MODULES.includes(slug);

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl font-semibold capitalize">{moduleName}</h1>
      <div className="mt-4 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        {isApiOnly ? (
          <>
            <p className="text-sm text-white/60">
              The backend API for this module is fully working today — see{" "}
              <code className="text-brand-cyan">apps/api/src/routes/{slug === "analytics" ? "dashboardRoutes" : `${slug.replace(/s$/, "")}Routes`}.ts</code>. A
              dedicated dashboard page just hasn't been built yet.
            </p>
            <p className="text-xs text-white/40 mt-3">
              Until then, use the API directly (Postman/curl with your access token) or the Prisma Studio browser (
              <code className="text-white/60">npm run db:studio</code>).
            </p>
          </>
        ) : (
          <p className="text-sm text-white/60">
            This module is planned but neither the API nor the UI exist yet. The database schema already has the
            necessary structure to support it — see <code className="text-brand-cyan">README.md</code>&apos;s module
            status table for what's needed to implement it.
          </p>
        )}
      </div>
    </div>
  );
}
