import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Badge } from "../components/ui/Card";

interface Lookup {
  id: string;
  name: string;
  isActive: boolean;
}

function LookupManager({ title, resource }: { title: string; resource: "services" | "industries" }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [resource], queryFn: () => api.get<Lookup[]>(`/admin/${resource}`) });
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: () => api.post(`/admin/${resource}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      setName("");
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/${resource}/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });

  return (
    <Card>
      <h2 className="text-sm font-medium mb-4">{title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Add a new ${title.toLowerCase().slice(0, -1)}…`}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-brand-indigo text-white text-sm rounded-lg px-4">
          Add
        </button>
      </form>

      {isLoading && <p className="text-xs text-white/40">Loading…</p>}

      <div className="space-y-1.5">
        {data?.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
            <span className="text-sm text-white">{item.name}</span>
            <button onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}>
              <Badge tone={item.isActive ? "low" : "high"}>{item.isActive ? "Active" : "Disabled"}</Badge>
            </button>
          </div>
        ))}
        {data?.length === 0 && <p className="text-xs text-white/30">None added yet.</p>}
      </div>
    </Card>
  );
}

export function AdminPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-white/40 mt-1">Manage the services and industries that show up across the CRM and website forms.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <LookupManager title="Services" resource="services" />
        <LookupManager title="Industries" resource="industries" />
      </div>

      <Card>
        <h2 className="text-sm font-medium mb-2">Users &amp; Roles</h2>
        <p className="text-xs text-white/40">Full user management lives on its own page — see "Users &amp; Roles" in the sidebar.</p>
      </Card>
    </div>
  );
}
