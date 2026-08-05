import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "./store/authStore";
import { useBootstrapSession } from "./hooks/useBootstrapSession";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";

// Route-level code splitting — recharts (DashboardPage) alone is a
// meaningful chunk of bundle size that a visitor landing on, say,
// /leads shouldn't have to download. Login/AppShell stay eager since
// they're on the critical path for every session.
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import("./pages/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const PipelinePage = lazy(() => import("./pages/PipelinePage").then((m) => ({ default: m.PipelinePage })));
const ClientsPage = lazy(() => import("./pages/ClientsPage").then((m) => ({ default: m.ClientsPage })));
const AiAssistantPage = lazy(() => import("./pages/AiAssistantPage").then((m) => ({ default: m.AiAssistantPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })));
const ModulePlaceholderPage = lazy(() => import("./pages/ModulePlaceholderPage").then((m) => ({ default: m.ModulePlaceholderPage })));

function PageFallback() {
  return <p className="text-white/30 text-sm">Loading…</p>;
}

function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-white/40 text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  useBootstrapSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/leads"
            element={
              <Suspense fallback={<PageFallback />}>
                <LeadsPage />
              </Suspense>
            }
          />
          <Route
            path="/pipeline"
            element={
              <Suspense fallback={<PageFallback />}>
                <PipelinePage />
              </Suspense>
            }
          />
          <Route
            path="/clients"
            element={
              <Suspense fallback={<PageFallback />}>
                <ClientsPage />
              </Suspense>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <Suspense fallback={<PageFallback />}>
                <AiAssistantPage />
              </Suspense>
            }
          />
          <Route
            path="/notifications"
            element={
              <Suspense fallback={<PageFallback />}>
                <NotificationsPage />
              </Suspense>
            }
          />
          <Route
            path="/users"
            element={
              <Suspense fallback={<PageFallback />}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <Suspense fallback={<PageFallback />}>
                <AuditLogsPage />
              </Suspense>
            }
          />

          {/* API-only modules (backend live, dedicated UI pending) and
              fully-planned modules both route here — see
              ModulePlaceholderPage for how it distinguishes the two. */}
          {["/projects", "/proposals", "/quotations", "/invoices", "/documents", "/tickets", "/analytics", "/communication", "/admin"].map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <Suspense fallback={<PageFallback />}>
                  <ModulePlaceholderPage />
                </Suspense>
              }
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
