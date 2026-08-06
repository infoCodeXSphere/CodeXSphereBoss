import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Owns the mobile sidebar open/closed state and shares it with both
 * children — Topbar needs it to render the hamburger toggle, Sidebar
 * needs it to know whether to render as an open drawer on narrow
 * screens. On desktop (md breakpoint and up) this state is simply
 * ignored — the sidebar is always visible there regardless.
 */
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0B0E14] text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
