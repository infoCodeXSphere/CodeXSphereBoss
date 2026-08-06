import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge } from "../components/ui/Card";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get<StaffUser[]>("/users") });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Users & Roles</h1>
        <p className="text-sm text-white/40 mt-1">Admin-only. Create new staff accounts and manage roles.</p>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{u.name}</td>
                <td className="px-4 py-3 text-white/60">{u.email}</td>
                <td className="px-4 py-3 text-white/60">{u.role.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.isActive ? "low" : "high"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/30">
        Creating users from the UI (a proper form + POST /api/users) is a quick follow-up — the endpoint already works,
        this page is currently read-only.
      </p>
    </div>
  );
}
