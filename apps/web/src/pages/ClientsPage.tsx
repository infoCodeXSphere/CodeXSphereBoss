import { useClients } from "../hooks/useClients";
import { Card } from "../components/ui/Card";

export function ClientsPage() {
  const { data, isLoading } = useClients();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Clients</h1>
        <p className="text-sm text-white/40 mt-1">Every client who started as a won lead, plus any added manually.</p>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((client) => (
          <Card key={client.id}>
            <div className="text-sm font-medium text-white">{client.name}</div>
            <div className="text-xs text-white/40 mt-0.5">{client.company ?? client.email}</div>
            <div className="flex gap-4 mt-3 text-xs text-white/50">
              <span>{client._count.projects} projects</span>
              <span>{client._count.invoices} invoices</span>
              <span>{client._count.supportTickets} tickets</span>
            </div>
          </Card>
        ))}
        {data?.length === 0 && <p className="text-white/40 text-sm">No clients yet — convert a won lead from the CRM.</p>}
      </div>
    </div>
  );
}
