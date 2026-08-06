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
import logoMark from "../../assets/logo-mark.png";

// Every module from the original brief now has a real, working route
// — nothing here links to a placeholder page anymore.
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

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/10 bg-[#0B0E14]">
      <div className="px-5 py-6 flex items-center gap-2">
        <img src={logoMark} alt="CodeXSphere" className="w-8 h-auto shrink-0" />
        <div>
          <div className="font-display font-semibold text-white text-sm leading-none">CBOS</div>
          <div className="text-[10px] text-white/40 mt-0.5">CodeXSphere Business OS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
  );
}
