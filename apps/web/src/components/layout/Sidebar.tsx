import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Building2,
  FolderKanban,
  FileText,
  Receipt,
  FileStack,
  Bot,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  UserCog,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

// Every module from the brief is represented here — implemented
// modules get a real route, everything else is honestly labeled
// "Planned" and links to a status page rather than a broken or fake
// screen. This list is itself the module-status source of truth for
// the sidebar; README.md has the same mapping for anyone reading code
// instead of using the app.
const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, status: "live" as const },
  { to: "/leads", label: "Smart CRM", icon: Users, status: "live" as const },
  { to: "/pipeline", label: "Sales Pipeline", icon: Kanban, status: "live" as const },
  { to: "/clients", label: "Clients", icon: Building2, status: "live" as const },
  { to: "/projects", label: "Project Management", icon: FolderKanban, status: "partial" as const },
  { to: "/proposals", label: "Proposals", icon: FileText, status: "partial" as const },
  { to: "/quotations", label: "Quotations", icon: Receipt, status: "partial" as const },
  { to: "/invoices", label: "Invoices", icon: Receipt, status: "partial" as const },
  { to: "/documents", label: "Documents", icon: FileStack, status: "partial" as const },
  { to: "/tickets", label: "Support Tickets", icon: LifeBuoy, status: "partial" as const },
  { to: "/ai-assistant", label: "AI Business Assistant", icon: Bot, status: "live" as const },
  { to: "/communication", label: "Communication Center", icon: MessageSquare, status: "planned" as const },
  { to: "/notifications", label: "Notification Center", icon: Bell, status: "live" as const },
  { to: "/analytics", label: "Analytics", icon: BarChart3, status: "partial" as const },
  { to: "/users", label: "Users & Roles", icon: UserCog, status: "live" as const },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, status: "live" as const },
  { to: "/admin", label: "Admin Panel", icon: Settings, status: "planned" as const },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: "", className: "" },
  partial: { label: "Basic", className: "bg-amber-500/15 text-amber-400" },
  planned: { label: "Planned", className: "bg-white/10 text-white/40" },
};

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/10 bg-[#0B0E14]">
      <div className="px-5 py-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet" />
        <div>
          <div className="font-display font-semibold text-white text-sm leading-none">CBOS</div>
          <div className="text-[10px] text-white/40 mt-0.5">CodeSphere Business OS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const badge = STATUS_BADGE[item.status];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive ? "bg-brand-indigo/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge.label && <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0", badge.className)}>{badge.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
