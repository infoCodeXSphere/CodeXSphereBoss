import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card } from "../components/ui/Card";

interface Quotation {
  id: string;
  total: string;
  pdfUrl: string | null;
  client: { name: string; company: string | null } | null;
  createdAt: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

function useQuotations() {
  return useQuery({ queryKey: ["quotations"], queryFn: () => api.get<Quotation[]>("/quotations") });
}

function NewQuotationForm({ onDone }: { onDone: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.post("/quotations", { clientId, items, taxPercent, discountPercent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      onDone();
    },
  });

  const updateItem = (i: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: field === "description" ? value : Number(value) } : item)));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && items.every((i) => i.description)) create.mutate();
      }}
      className="space-y-3"
    >
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required>
        <option value="">Select client…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.company ? `(${c.company})` : ""}
          </option>
        ))}
      </select>

      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_100px] gap-2">
          <input
            value={item.description}
            onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Item description"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateItem(i, "quantity", e.target.value)}
            placeholder="Qty"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={item.unitPrice}
            onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
            placeholder="Price"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
        className="text-xs text-brand-cyan"
      >
        + Add line item
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 block mb-1">Tax %</label>
          <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Discount %</label>
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button type="submit" disabled={create.isPending} className="w-full bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Generating PDF…" : "Generate Quotation PDF"}
      </button>
    </form>
  );
}

export function QuotationsPage() {
  const { data: quotations, isLoading } = useQuotations();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Quotation Generator</h1>
          <p className="text-sm text-white/40 mt-1">Line items, tax, and discount — calculated and PDF'd automatically.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ New Quotation"}
        </button>
      </div>

      {showForm && (
        <Card>
          <NewQuotationForm onDone={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {quotations?.map((q) => (
          <Card key={q.id}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div>
                <div className="text-sm font-medium text-white">
                  {q.client?.name} {q.client?.company ? `· ${q.client.company}` : ""}
                </div>
                <div className="text-xs text-white/40 mt-0.5">{new Date(q.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-mono text-white">₹{Number(q.total).toLocaleString("en-IN")}</span>
                {q.pdfUrl && (
                  <a href={q.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-cyan underline">
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
        {quotations?.length === 0 && <p className="text-white/40 text-sm">No quotations yet.</p>}
      </div>
    </div>
  );
}
