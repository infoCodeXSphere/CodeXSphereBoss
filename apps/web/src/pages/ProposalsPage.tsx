import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card, Badge } from "../components/ui/Card";

interface Proposal {
  id: string;
  title: string;
  status: string;
  pdfUrl: string | null;
  client: { name: string; company: string | null } | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, "low" | "medium" | "high"> = {
  DRAFT: "low",
  SENT: "medium",
  ACCEPTED: "low",
  REJECTED: "high",
  EXPIRED: "high",
};

function useProposals() {
  return useQuery({ queryKey: ["proposals"], queryFn: () => api.get<Proposal[]>("/proposals") });
}

function NewProposalForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [objectives, setObjectives] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [timeline, setTimeline] = useState("");
  const [pricing, setPricing] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      api.post("/proposals", {
        clientId,
        title,
        sections: {
          scope,
          objectives,
          deliverables: deliverables.split(",").map((d) => d.trim()).filter(Boolean),
          timeline,
          pricing,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && title) create.mutate();
      }}
      className="grid sm:grid-cols-2 gap-3"
    >
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required>
        <option value="">Select client…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.company ? `(${c.company})` : ""}
          </option>
        ))}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required />
      <textarea value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Scope" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
      <textarea
        value={objectives}
        onChange={(e) => setObjectives(e.target.value)}
        placeholder="Objectives"
        rows={2}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        value={deliverables}
        onChange={(e) => setDeliverables(e.target.value)}
        placeholder="Deliverables (comma-separated)"
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2"
      />
      <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="Timeline (e.g. 6 weeks)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="Pricing (e.g. ₹2,50,000)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <button type="submit" disabled={create.isPending} className="sm:col-span-2 bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Generating PDF…" : "Generate Proposal PDF"}
      </button>
    </form>
  );
}

export function ProposalsPage() {
  const { data: proposals, isLoading } = useProposals();
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/proposals/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposals"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Proposal Generator</h1>
          <p className="text-sm text-white/40 mt-1">Every proposal here has a real, downloadable branded PDF attached.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ New Proposal"}
        </button>
      </div>

      {showForm && (
        <Card>
          <NewProposalForm onDone={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {proposals?.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div>
                <div className="text-sm font-medium text-white">{p.title}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {p.client?.name} {p.client?.company ? `· ${p.client.company}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.pdfUrl && (
                  <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-cyan underline">
                    Download PDF
                  </a>
                )}
                <select
                  value={p.status}
                  onChange={(e) => updateStatus.mutate({ id: p.id, status: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1"
                >
                  {["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
            </div>
          </Card>
        ))}
        {proposals?.length === 0 && <p className="text-white/40 text-sm">No proposals yet.</p>}
      </div>
    </div>
  );
}
