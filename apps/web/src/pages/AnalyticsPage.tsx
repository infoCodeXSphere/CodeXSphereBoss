import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { Card, StatCard } from "../components/ui/Card";

interface FinancialSummary {
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
}

/**
 * Module 15 — Analytics. Builds on top of the same real dashboard
 * summary endpoint used by DashboardPage, plus the financial summary
 * from Invoices, adding the pieces that were previously only visible
 * scattered across other pages (conversion, revenue) into one
 * reporting view.
 */
export function AnalyticsPage() {
  const { data: dashboard } = useDashboardSummary();
  const { data: financials } = useQuery({ queryKey: ["invoices-summary"], queryFn: () => api.get<FinancialSummary>("/invoices/summary/financials") });

  const funnelData = dashboard
    ? [
        { name: "Total Leads", count: dashboard.totalLeads },
        { name: "Won", count: dashboard.wonCount },
        { name: "Lost", count: dashboard.lostCount },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Cross-module reporting — sales, revenue, and support in one view.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Conversion Rate" value={`${dashboard?.conversionRate ?? 0}%`} />
        <StatCard label="Total Clients" value={dashboard?.clientCount ?? 0} />
        <StatCard label="Revenue Paid" value={`₹${(financials?.totalPaid ?? 0).toLocaleString("en-IN")}`} />
        <StatCard label="Revenue Outstanding" value={`₹${(financials?.totalOutstanding ?? 0).toLocaleString("en-IN")}`} />
      </div>

      <Card>
        <h2 className="text-sm font-medium mb-4">Sales funnel</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnelData}>
            <XAxis dataKey="name" tick={{ fill: "#8B93A7", fontSize: 11 }} />
            <YAxis tick={{ fill: "#8B93A7", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#141924", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
            <Bar dataKey="count" fill="#22D3EE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label="Overdue Invoices" value={dashboard?.overdueInvoices ?? 0} hint="Amount overdue" />
        <StatCard label="Open Support Tickets" value={dashboard?.openTickets ?? 0} />
      </div>
    </div>
  );
}
