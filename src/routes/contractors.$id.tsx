import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate, formatPct } from "@/lib/format";

export const Route = createFileRoute("/contractors/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "operations_officer", "credit_officer"]}>
      <ContractorDetail />
    </ProtectedRoute>
  ),
});

function ContractorDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["contractor", id],
    queryFn: async () => {
      const [c, contracts, scores] = await Promise.all([
        supabase.from("contractors").select("*").eq("id", id).single(),
        supabase.from("contractor_contracts").select("*, project:projects(name,location)").eq("contractor_id", id).order("created_at", { ascending: false }),
        supabase.from("contractor_scores").select("*").eq("contractor_id", id).order("created_at", { ascending: false }).limit(1),
      ]);
      return { c: c.data as any, contracts: contracts.data ?? [], score: (scores.data ?? [])[0] };
    },
  });

  if (isLoading || !data?.c) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;
  const c = data.c;
  const s = data.score as any;
  const avg = s ? [s.delivery, s.quality, s.safety, s.compliance, s.financial_reliability].filter((v: any) => v != null).reduce((a: number, b: any) => a + Number(b), 0) / 5 : null;

  return (
    <>
      <PageHeader title={c.name} description={`${c.specialization ?? "—"} · NCA ${c.nca_category ?? "—"}`} actions={<StatusBadge status={c.status} />} />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm">
          <h3 className="font-semibold text-slate-900 mb-2">Profile</h3>
          <Row k="Registration" v={c.registration_number} />
          <Row k="Email" v={c.email} />
          <Row k="Phone" v={c.phone} />
          <Row k="Joined" v={formatDate(c.created_at)} />
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Performance scorecard</h3>
            {avg != null && <div className="text-2xl font-semibold text-[#1E3A5F]">{avg.toFixed(1)}<span className="text-sm text-slate-400">/5</span></div>}
          </div>
          {!s ? <div className="text-sm text-slate-500">No scores recorded.</div> : (
            <div className="grid sm:grid-cols-5 gap-3">
              {[["Delivery", s.delivery], ["Quality", s.quality], ["Safety", s.safety], ["Compliance", s.compliance], ["Financial", s.financial_reliability]].map(([k, v]: any) => (
                <div key={k} className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-500">{k}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{v ?? "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Contracts ({data.contracts.length})</h3>
        {data.contracts.length === 0 ? <div className="text-sm text-slate-500">No contracts on file.</div> : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b border-slate-100"><tr><th className="py-2">Project</th><th>Scope</th><th>Amount</th><th>Retention</th><th>Period</th><th>Status</th></tr></thead>
            <tbody>
              {(data.contracts as any[]).map((k) => (
                <tr key={k.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 font-medium">{k.project?.name ?? "—"}</td>
                  <td>{k.scope ?? "—"}</td>
                  <td>{formatKES(k.amount)}</td>
                  <td>{formatPct(k.retention_pct)}</td>
                  <td className="text-slate-500">{formatDate(k.start_date)} → {formatDate(k.end_date)}</td>
                  <td><StatusBadge status={k.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-900">{v ?? "—"}</span></div>;
}
