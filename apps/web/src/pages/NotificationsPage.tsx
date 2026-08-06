import { useNotifications, useMarkAllRead } from "../hooks/useNotifications";
import { Card } from "../components/ui/Card";

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Notification Center</h1>
          <p className="text-sm text-white/40 mt-1">New enquiries, overdue invoices, ticket updates, and more.</p>
        </div>
        <button onClick={() => markAllRead.mutate()} className="text-xs text-brand-cyan">
          Mark all read
        </button>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-2">
        {data?.notifications.map((n) => (
          <Card key={n.id} className={n.isRead ? "opacity-50" : ""}>
            <div className="flex flex-wrap items-center justify-between gap-y-3">
              <span className="text-sm text-white font-medium">{n.title}</span>
              <span className="text-[10px] text-white/30">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">{n.message}</p>
          </Card>
        ))}
        {data?.notifications.length === 0 && <p className="text-white/40 text-sm">No notifications yet.</p>}
      </div>
    </div>
  );
}
