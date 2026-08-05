import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { StatCard, Card } from "../components/ui/Card";
import { PIPELINE_STAGE_LABELS } from "@cbos/shared";

const COLORS = ["#5B6EFF", "#22D3EE", "#9B6BFF", "#F59E0B", "#EF4444", "#10B981", "#6B7280", "#3B82F6"];

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return <p className="text-white/40 text-sm">Loading dashboard…</p>;
  }

  const stageData = data.leadsByStage.map((s) => ({
    name: PIPELINE_STAGE_LABELS[s.stage as keyof typeof PIPELINE_STAGE_LABELS] ?? s.stage,
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Live numbers from the CRM — nothing here is sample data.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={data.totalLeads} />
        <StatCard label="Clients" value={data.clientCount} />
        <StatCard label="Conversion Rate" value={`${data.conversionRate}%`} hint={`${data.wonCount} won / ${data.lostCount} lost`} />
        <StatCard label="Won Revenue (est.)" value={`₹${Number(data.totalWonRevenue).toLocaleString("en-IN")}`} />
        <StatCard label="Overdue Invoices" value={data.overdueInvoices} />
        <StatCard label="Open Support Tickets" value={data.openTickets} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-medium mb-4">Leads by pipeline stage</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stageData}>
              <XAxis dataKey="name" tick={{ fill: "#8B93A7", fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#8B93A7", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#141924", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
              <Bar dataKey="count" fill="#5B6EFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-sm font-medium mb-4">Lead sources</h2>
          {data.leadsBySource.length === 0 ? (
            <p className="text-xs text-white/40">No referral source data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={90}>
                  {data.leadsBySource.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#141924", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
