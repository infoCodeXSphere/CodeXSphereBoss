import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string;
  industry: string | null;
  country: string | null;
  createdAt: string;
  _count: { projects: number; invoices: number; supportTickets: number };
}

export function useClients() {
  return useQuery({ queryKey: ["clients"], queryFn: () => api.get<Client[]>("/clients") });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: () => api.get(`/clients/${id}`),
    enabled: Boolean(id),
  });
}
