import { useState } from "react";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@cbos/shared";
import { usePipeline, useUpdateLeadStage, type Lead } from "../hooks/useLeads";
import { Badge } from "../components/ui/Card";

/**
 * Native HTML5 drag-and-drop (draggable + onDragStart/onDrop), not an
 * external DnD library — this is a single flat list of columns with
 * no nested sortable reordering within a column, which native events
 * handle perfectly well without the bundle-size and API surface of
 * something like @hello-pangea/dnd. If within-column manual ordering
 * becomes a real requirement later, that's the point to add one.
 */
export function PipelinePage() {
  const { data, isLoading } = usePipeline();
  const updateStage = useUpdateLeadStage();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDrop = (stage: string) => {
    if (draggedId) {
      updateStage.mutate({ id: draggedId, pipelineStage: stage });
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  if (isLoading || !data) {
    return <p className="text-white/40 text-sm">Loading pipeline…</p>;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl font-semibold">Sales Pipeline</h1>
        <p className="text-sm text-white/40 mt-1">Drag a card to move it between stages.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.filter((s) => s !== "ARCHIVED").map((stage) => {
          const leads: Lead[] = data[stage] ?? [];
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage)}
              className={`w-72 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-3 ${dragOverStage === stage ? "kanban-drop-target" : ""}`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">{PIPELINE_STAGE_LABELS[stage]}</h3>
                <span className="text-[10px] text-white/30">{leads.length}</span>
              </div>

              <div className="space-y-2 min-h-[40px]">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    className="bg-[#141924] border border-white/10 rounded-xl p-3 cursor-grab active:cursor-grabbing"
                  >
                    <div className="text-sm text-white font-medium truncate">{lead.name}</div>
                    <div className="text-xs text-white/40 truncate">{lead.company ?? lead.email}</div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge tone={lead.priority === "HIGH" ? "high" : lead.priority === "MEDIUM" ? "medium" : "low"}>{lead.priority}</Badge>
                      <span className="text-[10px] font-mono text-white/30">Score {lead.leadScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
