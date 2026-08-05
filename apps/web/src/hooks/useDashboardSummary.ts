import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DashboardSummary {
  totalLeads: number;
  leadsByStage: Array<{ stage: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  totalWonRevenue: number;
  clientCount: number;
  overdueInvoices: number;
  openTickets: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
    refetchInterval: 60_000,
  });
}
