import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card, Badge } from "../components/ui/Card";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  client: { name: string; company: string | null } | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, "low" | "medium" | "high"> = {
  OPEN: "high",
  IN_PROGRESS: "medium",
  WAITING_ON_CLIENT: "medium",
  RESOLVED: "low",
  CLOSED: "low",
};

function NewTicketForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.post("/tickets", { clientId, subject, description, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && subject && description) create.mutate();
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
      <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2" required />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2"
        required
      />
      <button type="submit" disabled={create.isPending} className="sm:col-span-2 bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Creating…" : "Create Ticket"}
      </button>
    </form>
  );
}

export function TicketsPage() {
  const { data: tickets, isLoading } = useQuery({ queryKey: ["tickets"], queryFn: () => api.get<Ticket[]>("/tickets") });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-white/40 mt-1">Client support requests, tracked to resolution.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {showForm && (
        <Card>
          <NewTicketForm onDone={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {tickets?.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{t.subject}</div>
                <div className="text-xs text-white/40 mt-0.5 truncate">
                  {t.client?.name} {t.client?.company ? `· ${t.client.company}` : ""} — {t.description}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={t.priority === "URGENT" || t.priority === "HIGH" ? "high" : t.priority === "MEDIUM" ? "medium" : "low"}>{t.priority}</Badge>
                <select
                  value={t.status}
                  onChange={(e) => updateStatus.mutate({ id: t.id, status: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1"
                >
                  {["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <Badge tone={STATUS_TONE[t.status]}>{t.status.replace(/_/g, " ")}</Badge>
              </div>
            </div>
          </Card>
        ))}
        {tickets?.length === 0 && <p className="text-white/40 text-sm">No support tickets yet.</p>}
      </div>
    </div>
  );
}
