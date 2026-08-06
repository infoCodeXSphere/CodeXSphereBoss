import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, type LazyExoticComponent } from "react";
import { useAuthStore } from "./store/authStore";
import { useBootstrapSession } from "./hooks/useBootstrapSession";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";

// Route-level code splitting — every page below is its own chunk, so
// a visitor landing on /leads doesn't download the Dashboard's chart
// library, etc. Login/AppShell stay eager since they're on the
// critical path for every session.
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import("./pages/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const PipelinePage = lazy(() => import("./pages/PipelinePage").then((m) => ({ default: m.PipelinePage })));
const ClientsPage = lazy(() => import("./pages/ClientsPage").then((m) => ({ default: m.ClientsPage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProposalsPage = lazy(() => import("./pages/ProposalsPage").then((m) => ({ default: m.ProposalsPage })));
const QuotationsPage = lazy(() => import("./pages/QuotationsPage").then((m) => ({ default: m.QuotationsPage })));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })));
const TicketsPage = lazy(() => import("./pages/TicketsPage").then((m) => ({ default: m.TicketsPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const CommunicationPage = lazy(() => import("./pages/CommunicationPage").then((m) => ({ default: m.CommunicationPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AiAssistantPage = lazy(() => import("./pages/AiAssistantPage").then((m) => ({ default: m.AiAssistantPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })));

function PageFallback() {
  return <p className="text-white/30 text-sm">Loading…</p>;
}

function withSuspense(Component: LazyExoticComponent<() => JSX.Element>) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
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
          <Route path="/" element={withSuspense(DashboardPage)} />
          <Route path="/leads" element={withSuspense(LeadsPage)} />
          <Route path="/pipeline" element={withSuspense(PipelinePage)} />
          <Route path="/clients" element={withSuspense(ClientsPage)} />
          <Route path="/projects" element={withSuspense(ProjectsPage)} />
          <Route path="/proposals" element={withSuspense(ProposalsPage)} />
          <Route path="/quotations" element={withSuspense(QuotationsPage)} />
          <Route path="/invoices" element={withSuspense(InvoicesPage)} />
          <Route path="/documents" element={withSuspense(DocumentsPage)} />
          <Route path="/tickets" element={withSuspense(TicketsPage)} />
          <Route path="/analytics" element={withSuspense(AnalyticsPage)} />
          <Route path="/communication" element={withSuspense(CommunicationPage)} />
          <Route path="/admin" element={withSuspense(AdminPage)} />
          <Route path="/ai-assistant" element={withSuspense(AiAssistantPage)} />
          <Route path="/notifications" element={withSuspense(NotificationsPage)} />
          <Route path="/users" element={withSuspense(UsersPage)} />
          <Route path="/audit-logs" element={withSuspense(AuditLogsPage)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
