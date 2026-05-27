import { ReactNode, useState } from "react";
import { Search, Download } from "lucide-react";

export function ListShell({
  search, setSearch, filter, setFilter, filters = [], onExport, children,
}: {
  search: string; setSearch: (s: string) => void;
  filter?: string; setFilter?: (s: string) => void;
  filters?: { value: string; label: string }[];
  onExport?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-9 pr-3 h-10 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          />
        </div>
        {filters.length > 0 && setFilter && (
          <select
            value={filter ?? ""} onChange={(e) => setFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
          >
            <option value="">All statuses</option>
            {filters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        )}
        {onExport && (
          <button onClick={onExport} className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
