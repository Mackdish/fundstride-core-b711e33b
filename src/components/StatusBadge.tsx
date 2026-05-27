const MAP: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  compliant: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  open: "bg-amber-100 text-amber-800 ring-amber-200",
  rejected: "bg-red-100 text-red-700 ring-red-200",
  blocked: "bg-red-100 text-red-700 ring-red-200",
  closed: "bg-slate-100 text-slate-700 ring-slate-200",
  unverified: "bg-amber-100 text-amber-800 ring-amber-200",
  verified: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  dark_red: "bg-red-200 text-red-900 ring-red-300",
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-orange-100 text-orange-800 ring-orange-200",
  critical: "bg-red-100 text-red-700 ring-red-200",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? "draft").toLowerCase();
  const cls = MAP[key] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cls}`}>
      {key.replace(/_/g, " ")}
    </span>
  );
}
