import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card } from "../components/ui/Card";
import { Calendar, Mail } from "lucide-react";

interface FeedItem {
  type: "meeting" | "email";
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

function useFeed() {
  return useQuery({ queryKey: ["comm-feed"], queryFn: () => api.get<FeedItem[]>("/communications/feed") });
}

function NewMeetingForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.post("/meetings", { clientId, scheduledAt, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comm-feed"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && scheduledAt) create.mutate();
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
      <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2"
      />
      <button type="submit" disabled={create.isPending} className="sm:col-span-2 bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Scheduling…" : "Schedule Meeting"}
      </button>
    </form>
  );
}

export function CommunicationPage() {
  const { data: feed, isLoading } = useFeed();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Communication Center</h1>
          <p className="text-sm text-white/40 mt-1">Meetings and emails, in one chronological feed.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ Schedule Meeting"}
        </button>
      </div>

      {showForm && (
        <Card>
          <NewMeetingForm onDone={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {feed?.map((item) => (
          <Card key={`${item.type}-${item.id}`}>
            <div className="flex items-center gap-3">
              {item.type === "meeting" ? <Calendar size={16} className="text-brand-indigo shrink-0" /> : <Mail size={16} className="text-brand-cyan shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{item.title}</div>
                <div className="text-xs text-white/40">{item.subtitle}</div>
              </div>
              <span className="text-xs text-white/30 shrink-0">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          </Card>
        ))}
        {feed?.length === 0 && <p className="text-white/40 text-sm">No meetings or emails logged yet.</p>}
      </div>
    </div>
  );
}
