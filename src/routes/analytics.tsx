import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatPct } from "@/lib/format";
import { ListShell, exportCsv } from "@/components/ListShell";
import { useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: () => <ProtectedRoute roles={["super_admin", "executive", "risk_compliance_officer"]}><Analytics /></ProtectedRoute>,
});

function Analytics() {
  const [_, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dash"],
    queryFn: async () => {
      const [loans, dds, reps, alerts, projects] = await Promise.all([
        supabase.from("loan_facilities").select("*"),
        supabase.from("drawdown_requests").select("*"),
        supabase.from("repayment_schedules").select("*"),
        supabase.from("risk_alerts").select("*"),
        supabase.from("projects").select("location,status,expected_value"),
      ]);
      return { loans: loans.data ?? [], dds: dds.data ?? [], reps: reps.data ?? [], alerts: alerts.data ?? [], projects: projects.data ?? [] };
    },
  });

  if (isLoading || !data) return <div className="grid gap-3"><div className="h-24 bg-slate-50 animate-pulse rounded-xl" /><div className="h-96 bg-slate-50 animate-pulse rounded-xl" /></div>;

  const approved = data.loans.reduce((s: number, l: any) => s + Number(l.approved_amount ?? 0), 0);
  const disbursed = data.dds.filter((d: any) => ["completed", "active"].includes(d.status)).reduce((s: number, d: any) => s + Number(d.certified_amount ?? 0), 0);
  const overdue = data.reps.filter((r: any) => r.status === "pending" && new Date(r.instalment_date) < new Date());
  const overdueAmt = overdue.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
  const par30 = approved > 0 ? (overdue.filter((r: any) => Date.now() - new Date(r.instalment_date).getTime() > 30 * 86400_000).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0) / approved) * 100 : 0;
  const utilization = approved > 0 ? (disbursed / approved) * 100 : 0;
  const openAlerts = data.alerts.filter((a: any) => a.status === "open").length;

  const byCounty: Record<string, { count: number; value: number }> = {};
  data.projects.forEach((p: any) => {
    const k = (p.location ?? "Unknown").split(",")[0].trim();
    byCounty[k] = byCounty[k] ?? { count: 0, value: 0 };
    byCounty[k].count++;
    byCounty[k].value += Number(p.expected_value ?? 0);
  });
  const counties = Object.entries(byCounty).sort((a, b) => b[1].value - a[1].value);
  const maxCountyValue = Math.max(...counties.map(([, v]) => v.value), 1);

  return (
    <>
      <PageHeader title="Executive analytics" description="Portfolio posture, risk indicators, geographic concentration." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Approved book" value={formatKES(approved)} trend="up" />
        <KPI label="Disbursed" value={formatKES(disbursed)} sub={formatPct(utilization) + " utilised"} trend="up" />
        <KPI label="Overdue exposure" value={formatKES(overdueAmt)} sub={`${overdue.length} instalments`} trend="down" />
        <KPI label="PAR 30+" value={formatPct(par30)} sub={`${openAlerts} open alerts`} trend={par30 > 5 ? "warn" : "up"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Geographic concentration (by value)</h3>
          {counties.length === 0 ? <p className="text-sm text-slate-500">No project data.</p> : (
            <ul className="space-y-3">
              {counties.slice(0, 8).map(([name, v]) => (
                <li key={name}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium">{name}</span><span className="text-slate-500">{v.count} project{v.count > 1 ? "s" : ""} · {formatKES(v.value)}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-[#1E3A5F]" style={{ width: `${(v.value / maxCountyValue) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Disbursement pipeline</h3>
          {[
            ["Pending", data.dds.filter((d: any) => d.status === "pending").length, "bg-amber-500"],
            ["Approved", data.dds.filter((d: any) => d.status === "active").length, "bg-emerald-500"],
            ["Released", data.dds.filter((d: any) => d.status === "completed").length, "bg-[#1E3A5F]"],
            ["Blocked", data.dds.filter((d: any) => d.status === "blocked").length, "bg-red-500"],
          ].map(([k, v, c]: any) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{k}</div>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <ListShell search="" setSearch={setSearch} onExport={() => exportCsv("counties.csv", counties.map(([name, v]) => ({ county: name, projects: v.count, value: v.value })))}>
        <div className="text-xs text-slate-500">Export geographic breakdown.</div>
      </ListShell>
    </>
  );
}

function KPI({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "warn" }) {
  const Icon = trend === "down" ? TrendingDown : trend === "warn" ? AlertCircle : TrendingUp;
  const color = trend === "down" ? "text-red-600" : trend === "warn" ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && <div className={`mt-1 flex items-center gap-1 text-xs ${color}`}><Icon className="h-3.5 w-3.5" />{sub}</div>}
    </div>
  );
}
