import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/risk/")({
  component: () => <ProtectedRoute roles={["super_admin","risk_compliance_officer","executive"]}><RiskDash /></ProtectedRoute>,
});

function RiskDash() {
  const { data: alerts } = useQuery({
    queryKey: ["risk-alerts-summary"],
    queryFn: async () => (await supabase.from("risk_alerts").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  const stageData = [{ label: "Stage 1", count: 4, color: "bg-emerald-500" }, { label: "Stage 2", count: 2, color: "bg-amber-500" }, { label: "Stage 3", count: 1, color: "bg-red-500" }];

  return (
    <>
      <PageHeader title="Risk dashboard" description="Portfolio risk posture, early warnings, IFRS 9 staging."
        actions={<Link to="/risk/alerts" className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium flex items-center">View all alerts</Link>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">IFRS 9 staging</h3>
          {stageData.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${s.color}`} />{s.label}</div>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Active alerts</h3>
          {(alerts ?? []).length === 0 ? <p className="text-sm text-slate-500">No active alerts.</p> :
            (alerts ?? []).map((a: any) => (
              <div key={a.id} className="py-3 border-b border-slate-100 last:border-0 flex justify-between items-start">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{a.trigger_event}</div>
                  <div className="text-xs text-slate-500">Due {formatDate(a.due_date)}</div>
                </div>
                <StatusBadge status={a.severity} />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
