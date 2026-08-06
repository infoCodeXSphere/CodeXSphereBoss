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
  X,
} from "lucide-react";
import logoMark from "../../assets/logo-mark.png";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Smart CRM", icon: Users },
  { to: "/pipeline", label: "Sales Pipeline", icon: Kanban },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/projects", label: "Project Management", icon: FolderKanban },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/quotations", label: "Quotations", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/documents", label: "Documents", icon: FileStack },
  { to: "/tickets", label: "Support Tickets", icon: LifeBuoy },
  { to: "/ai-assistant", label: "AI Business Assistant", icon: Bot },
  { to: "/communication", label: "Communication Center", icon: MessageSquare },
  { to: "/notifications", label: "Notification Center", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/users", label: "Users & Roles", icon: UserCog },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { to: "/admin", label: "Admin Panel", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Two visually different behaviors from one component, split by the
 * `md:` breakpoint:
 * - Desktop (md+): a normal, always-visible, static panel in the
 *   document flow — `open`/`onClose` are simply irrelevant there.
 * - Mobile (below md): a fixed off-canvas drawer that slides in from
 *   the left over a dark backdrop, controlled by `open`. Tapping the
 *   backdrop, the close button, or any nav link all close it —
 *   navigating away is exactly when a mobile user expects the menu
 *   to get out of the way.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop — mobile only, only rendered while the drawer is open */}
      {open && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={clsx(
          "w-64 shrink-0 h-screen flex flex-col border-r border-white/10 bg-[#0B0E14] z-50",
          "fixed top-0 left-0 transition-transform duration-200 md:sticky md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-6 flex items-center gap-2">
          <img src={logoMark} alt="CodeXSphere" className="w-8 h-auto shrink-0" />
          <div className="flex-1">
            <div className="font-display font-semibold text-white text-sm leading-none">CBOS</div>
            <div className="text-[10px] text-white/40 mt-0.5">CodeXSphere Business OS</div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive ? "bg-brand-indigo/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
