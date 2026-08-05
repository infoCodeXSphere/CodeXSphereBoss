import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("bg-white/[0.03] border border-white/10 rounded-2xl p-5", className)}>{children}</div>;
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-2xl font-display font-semibold text-white mt-1">{value}</div>
      {hint && <div className="text-[11px] text-white/40 mt-1">{hint}</div>}
    </Card>
  );
}

export function Badge({ children, tone = "default" }: PropsWithChildren<{ tone?: "default" | "high" | "medium" | "low" }>) {
  const toneClass = {
    default: "bg-white/10 text-white/70",
    high: "bg-red-500/15 text-red-400",
    medium: "bg-amber-500/15 text-amber-400",
    low: "bg-white/10 text-white/50",
  }[tone];
  return <span className={clsx("text-[10px] font-medium px-2 py-0.5 rounded-full", toneClass)}>{children}</span>;
}
