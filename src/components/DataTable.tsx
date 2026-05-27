import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, loading, empty,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 animate-pulse bg-slate-50" />
        ))}
      </div>
    );
  }
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`text-left font-medium text-slate-600 px-4 py-3 ${c.className ?? ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-slate-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                {columns.map((c, i) => (
                  <td key={i} className={`px-4 py-3 text-slate-700 ${c.className ?? ""}`}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
