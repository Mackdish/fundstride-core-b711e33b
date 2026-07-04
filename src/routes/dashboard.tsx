import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";
import { Banknote, Building2, Wallet, ShieldAlert, Users, FileCheck2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: () => <ProtectedRoute><Dashboard /></ProtectedRoute>,
});

function Dashboard() {
  const { user, roles } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [c, p, l, d, a, r] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("loan_facilities").select("approved_amount"),
        supabase.from("drawdown_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("appraisals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("risk_alerts").select("severity").eq("status", "open"),
      ]);
      const portfolio = (l.data ?? []).reduce((s: number, x: any) => s + Number(x.approved_amount ?? 0), 0);
      return {
        customers: c.count ?? 0,
        projects: p.count ?? 0,
        portfolio,
        pendingDrawdowns: d.count ?? 0,
        pendingAppraisals: a.count ?? 0,
        openAlerts: r.data?.length ?? 0,
      };
    },
    staleTime: 2 * 60_000,
    placeholderData: (prev) => prev,
  });

  const chartData = [
    { name: "Foundation", planned: 30, actual: 28 },
    { name: "Superstructure", planned: 65, actual: 52 },
    { name: "Completion", planned: 100, actual: 0 },
  ];
  const riskData = [
    { name: "Green", value: 4, fill: "#10B981" },
    { name: "Amber", value: 2, fill: "#F59E0B" },
    { name: "Red", value: 1, fill: "#EF4444" },
  ];

  const kpis = [
    { label: "Total Portfolio", value: formatKES(stats?.portfolio ?? 0), icon: Banknote, color: "text-emerald-600 bg-emerald-50" },
    { label: "Active Projects", value: stats?.projects ?? 0, icon: Building2, color: "text-blue-600 bg-blue-50" },
    { label: "Customers", value: stats?.customers ?? 0, icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Pending Drawdowns", value: stats?.pendingDrawdowns ?? 0, icon: Wallet, color: "text-amber-600 bg-amber-50" },
    { label: "Pending Appraisals", value: stats?.pendingAppraisals ?? 0, icon: FileCheck2, color: "text-indigo-600 bg-indigo-50" },
    { label: "Open Risk Alerts", value: stats?.openAlerts ?? 0, icon: ShieldAlert, color: "text-red-600 bg-red-50" },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.email?.split("@")[0] ?? "User"}`}
        description={roles.length ? `Signed in as ${roles.map((r) => ROLE_LABELS[r]).join(", ")}` : "No roles assigned yet"}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((k) => {
          const I = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={`h-9 w-9 rounded-md flex items-center justify-center ${k.color}`}><I className="h-4 w-4" /></div>
              <div className="mt-3 text-xs text-slate-500">{k.label}</div>
              <div className="text-lg font-semibold text-slate-900 mt-1">{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Project completion (planned vs actual)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="planned" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Risk grade distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {riskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
