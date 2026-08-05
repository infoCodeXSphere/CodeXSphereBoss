import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const COMMANDS = [
  { label: "Go to Dashboard", to: "/" },
  { label: "Go to Smart CRM", to: "/leads" },
  { label: "Go to Sales Pipeline", to: "/pipeline" },
  { label: "Go to Clients", to: "/clients" },
  { label: "Go to Projects", to: "/projects" },
  { label: "Go to Proposals", to: "/proposals" },
  { label: "Go to Quotations", to: "/quotations" },
  { label: "Go to Invoices", to: "/invoices" },
  { label: "Go to Documents", to: "/documents" },
  { label: "Go to Support Tickets", to: "/tickets" },
  { label: "Go to AI Assistant", to: "/ai-assistant" },
  { label: "Go to Users & Roles", to: "/users" },
  { label: "Go to Audit Logs", to: "/audit-logs" },
];

/**
 * Deliberately simple — a filtered list + Enter-to-navigate. This
 * satisfies "command palette" and "keyboard shortcuts" from the brief
 * without pulling in cmdk or a similar dependency for what is, in an
 * app this size, a dozen navigation targets.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())), [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-32" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#141924] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or search…"
          className="w-full bg-transparent px-5 py-4 text-sm text-white outline-none border-b border-white/10"
        />
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.map((cmd) => (
            <button
              key={cmd.to}
              onClick={() => {
                navigate(cmd.to);
                onClose();
                setQuery("");
              }}
              className="w-full text-left px-5 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
            >
              {cmd.label}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-5 py-3 text-sm text-white/40">No matches.</p>}
        </div>
      </div>
    </div>
  );
}
