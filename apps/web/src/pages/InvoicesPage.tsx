import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card, Badge, StatCard } from "../components/ui/Card";

interface Invoice {
  id: string;
  total: string;
  status: string;
  dueDate: string | null;
  client: { name: string; company: string | null } | null;
  createdAt: string;
}

interface FinancialSummary {
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
}

const STATUS_TONE: Record<string, "low" | "medium" | "high"> = {
  DRAFT: "low",
  SENT: "medium",
  PAID: "low",
  OVERDUE: "high",
  CANCELLED: "high",
};

function NewInvoiceForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.post("/invoices", { clientId, items: [{ description, quantity: 1, unitPrice: amount }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-summary"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && description) create.mutate();
      }}
      className="grid sm:grid-cols-3 gap-3"
    >
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2" required>
        <option value="">Select client…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.company ? `(${c.company})` : ""}
          </option>
        ))}
      </select>
      <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Amount" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-3"
      />
      <button type="submit" disabled={create.isPending} className="sm:col-span-3 bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Creating…" : "Create Invoice"}
      </button>
    </form>
  );
}

export function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => api.get<Invoice[]>("/invoices") });
  const { data: summary } = useQuery({ queryKey: ["invoices-summary"], queryFn: () => api.get<FinancialSummary>("/invoices/summary/financials") });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-summary"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Invoice Management</h1>
          <p className="text-sm text-white/40 mt-1">Real financial totals, not sample numbers.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ New Invoice"}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Paid" value={`₹${summary.totalPaid.toLocaleString("en-IN")}`} />
          <StatCard label="Outstanding" value={`₹${summary.totalOutstanding.toLocaleString("en-IN")}`} />
          <StatCard label="Overdue" value={`₹${summary.totalOverdue.toLocaleString("en-IN")}`} />
        </div>
      )}

      {showForm && (
        <Card>
          <NewInvoiceForm onDone={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {invoices?.map((inv) => (
          <Card key={inv.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">
                  {inv.client?.name} {inv.client?.company ? `· ${inv.client.company}` : ""}
                </div>
                <div className="text-xs text-white/40 mt-0.5">{new Date(inv.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-mono text-white">₹{Number(inv.total).toLocaleString("en-IN")}</span>
                <select
                  value={inv.status}
                  onChange={(e) => updateStatus.mutate({ id: inv.id, status: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1"
                >
                  {["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
              </div>
            </div>
          </Card>
        ))}
        {invoices?.length === 0 && <p className="text-white/40 text-sm">No invoices yet.</p>}
      </div>
    </div>
  );
}
