import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export function AuditLogsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["audit-logs"], queryFn: () => api.get<AuditLogEntry[]>("/audit-logs") });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-white/40 mt-1">Admin-only. Every write action across the platform, most recent first.</p>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Action</th>
              <th className="text-left px-4 py-3 font-medium">Entity</th>
              <th className="text-left px-4 py-3 font-medium">By</th>
              <th className="text-left px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((log) => (
              <tr key={log.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-white/60">
                  {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-3 text-white/60">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-3 text-white/40">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
