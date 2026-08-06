import { useState } from "react";
import { useLeads } from "../hooks/useLeads";
import { Badge } from "../components/ui/Card";
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGES } from "@cbos/shared";

function priorityTone(priority: string) {
  if (priority === "HIGH") return "high" as const;
  if (priority === "MEDIUM") return "medium" as const;
  return "low" as const;
}

export function LeadsPage() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("");
  const { data, isLoading } = useLeads({ search: search || undefined, stage: stage || undefined });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Smart CRM</h1>
          <p className="text-sm text-white/40 mt-1">Every website enquiry lands here automatically, scored and assigned.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, or email…"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-indigo flex-1 max-w-sm"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {PIPELINE_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Company</th>
              <th className="text-left px-4 py-3 font-medium">Stage</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Score</th>
              <th className="text-left px-4 py-3 font-medium">Assigned to</th>
              <th className="text-left px-4 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                  No leads match this filter yet.
                </td>
              </tr>
            )}
            {data?.items.map((lead) => (
              <tr key={lead.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white">{lead.name}</td>
                <td className="px-4 py-3 text-white/60">{lead.company ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{PIPELINE_STAGE_LABELS[lead.pipelineStage as keyof typeof PIPELINE_STAGE_LABELS] ?? lead.pipelineStage}</td>
                <td className="px-4 py-3">
                  <Badge tone={priorityTone(lead.priority)}>{lead.priority}</Badge>
                </td>
                <td className="px-4 py-3 text-white/60 font-mono">{lead.leadScore}</td>
                <td className="px-4 py-3 text-white/60">{lead.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-white/40">{new Date(lead.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
