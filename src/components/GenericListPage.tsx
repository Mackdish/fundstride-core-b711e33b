import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ListShell, exportCsv } from "@/components/ListShell";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus } from "lucide-react";

export interface GenericListConfig<T extends { id: string }> {
  title: string;
  description?: string;
  table: string;
  select?: string;
  searchFields: string[];
  columns: Column<T>[];
  newHref?: string;
  detailHref?: (row: T) => string;
  statusField?: keyof T;
  statusOptions?: { value: string; label: string }[];
  emptyMessage?: string;
}

export function GenericListPage<T extends { id: string; status?: string }>({ config }: { config: GenericListConfig<T> }) {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [config.table, status],
    queryFn: async () => {
      let q = supabase.from(config.table as any).select(config.select ?? "*").order("created_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const filtered = (data ?? []).filter((r: any) =>
    !search || config.searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title={config.title} description={config.description}
        actions={config.newHref && (
          <button onClick={() => nav({ to: config.newHref! })} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      />
      <ListShell
        search={search} setSearch={setSearch}
        filter={status} setFilter={setStatus}
        filters={config.statusOptions ?? []}
        onExport={() => exportCsv(`${config.table}.csv`, filtered as any)}
      >
        <DataTable
          columns={config.columns}
          rows={filtered}
          loading={isLoading}
          onRowClick={config.detailHref ? (row) => nav({ to: config.detailHref!(row) }) : undefined}
          empty={<EmptyState title="No records yet" message={config.emptyMessage ?? "Records will appear here once created."} />}
        />
      </ListShell>
    </>
  );
}

export { StatusBadge };
