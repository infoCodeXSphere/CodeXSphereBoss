import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Lead {
  id: string;
  leadCode: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  pipelineStage: string;
  priority: string;
  leadScore: number;
  estimatedRevenue: number | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export function useLeads(params: { stage?: string; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);

  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => api.get<{ items: Lead[]; total: number }>(`/leads?${query.toString()}`),
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ["leads-pipeline"],
    queryFn: () => api.get<Record<string, Lead[]>>("/leads/pipeline"),
    refetchInterval: 30_000,
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pipelineStage }: { id: string; pipelineStage: string }) => api.patch(`/leads/${id}/stage`, { pipelineStage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.get(`/leads/${id}`),
    enabled: Boolean(id),
  });
}
