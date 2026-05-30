import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/performance")({
  component: () => (
    <ProtectedRoute roles={["super_admin","executive","finance_officer","risk_compliance_officer"]}>
      <Performance />
    </ProtectedRoute>
  ),
});

function fmt(n: number, currency = "KSh") {
  if (!isFinite(n)) return "—";
  return `${currency} ${Math.round(n).toLocaleString()}`;
}
function pct(n: number) { return isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—"; }

function Performance() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? "KSh";

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["tenant_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_settings").select("*").maybeSingle();
      return data;
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ["performance-kpis"],
    queryFn: async () => {
      const [mf, loans, reps, alerts] = await Promise.all([
        supabase.from("monthly_financials").select("*").order("period", { ascending: true }),
        supabase.from("loan_facilities").select("approved_amount,status"),
        supabase.from("repayments").select("amount,allocation_principal,allocation_interest,payment_date"),
        supabase.from("risk_alerts").select("severity,status"),
      ]);
      const months = mf.data ?? [];
      const revenueYTD = months.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
      const netProfitYTD = months.reduce((s, r) => s + Number(r.net_profit ?? 0), 0);
      const portfolio = months.length ? Number(months.at(-1)!.closing_portfolio ?? 0)
        : (loans.data ?? []).filter((l: any) => l.status === "active").reduce((s, l: any) => s + Number(l.approved_amount ?? 0), 0);
      const last = months.at(-1);
      const par30 = last ? Number(last.par30 ?? 0) : 0;
      const npl = last ? Number(last.npl_ratio ?? 0) : 0;
      const liquidity = last ? Number(last.liquidity_ratio ?? 0) : 0;
      const ifrs9 = last ? Number(last.ifrs9_provision ?? 0) : 0;
      const collections = months.reduce((s, r) => s + Number(r.collections ?? 0), 0);
      const disbursements = months.reduce((s, r) => s + Number(r.disbursements ?? 0), 0);
      const collectionEff = disbursements > 0 ? collections / disbursements : 0;
      const margin = revenueYTD > 0 ? netProfitYTD / revenueYTD : 0;
      return { months, revenueYTD, netProfitYTD, portfolio, par30, npl, liquidity, ifrs9, collectionEff, margin };
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await supabase.from("branches").select("*").order("name")).data ?? [],
  });
  const { data: officers } = useQuery({
    queryKey: ["officers"],
    queryFn: async () => (await supabase.from("officers").select("*").order("name")).data ?? [],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Board & Management Financial Performance Dashboard"
        description={`${tenant?.name ?? ""} — KPIs, traffic-light summary, branches and officer scorecards.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Revenue YTD" value={fmt(kpis?.revenueYTD ?? 0, currency)} />
        <Kpi label="Net Profit YTD" value={fmt(kpis?.netProfitYTD ?? 0, currency)} />
        <Kpi label="Closing Portfolio" value={fmt(kpis?.portfolio ?? 0, currency)} />
        <Kpi label="PAR30" value={pct(kpis?.par30 ?? 0)} />
        <Kpi label="NPL Ratio" value={pct(kpis?.npl ?? 0)} />
        <Kpi label="Collection Efficiency" value={pct(kpis?.collectionEff ?? 0)} />
        <Kpi label="IFRS 9 Provision" value={fmt(kpis?.ifrs9 ?? 0, currency)} />
        <Kpi label="Liquidity Ratio" value={(kpis?.liquidity ?? 0).toFixed(2) + "x"} />
      </div>

      <TrafficLight settings={settings} kpis={kpis} />

      <TrendTable months={kpis?.months ?? []} currency={currency} />

      <div className="grid lg:grid-cols-2 gap-4">
        <BranchesTable rows={branches ?? []} />
        <OfficersTable rows={officers ?? []} currency={currency} />
      </div>

      <AssumptionsForm settings={settings} onSaved={refetchSettings} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function status(current: number, target: number, lowerIsBetter = false) {
  if (!isFinite(current)) return { tone: "bg-slate-100 text-slate-600", label: "—" };
  const ok = lowerIsBetter ? current <= target : current >= target;
  const warn = lowerIsBetter ? current <= target * 1.2 : current >= target * 0.8;
  if (ok) return { tone: "bg-emerald-100 text-emerald-700", label: "On track" };
  if (warn) return { tone: "bg-amber-100 text-amber-700", label: "Watch" };
  return { tone: "bg-red-100 text-red-700", label: "Off track" };
}

function TrafficLight({ settings, kpis }: any) {
  if (!settings || !kpis) return null;
  const rows = [
    { area: "Profitability", measure: "Net Profit Margin", target: settings.roe_target ?? 0.18, current: kpis.margin, fmt: pct, lower: false, action: "Improve pricing, reduce cost leakage and accelerate fee income." },
    { area: "Credit Risk", measure: "PAR30", target: settings.par30_threshold ?? 0.05, current: kpis.par30, fmt: pct, lower: true, action: "Tighten collections, restructure watch accounts and enforce early warning triggers." },
    { area: "Collections", measure: "Collection Efficiency", target: settings.collection_efficiency_target ?? 0.92, current: kpis.collectionEff, fmt: pct, lower: false, action: "Focus on arrears calling, site visits and promise-to-pay tracking." },
    { area: "Liquidity", measure: "Liquidity Ratio", target: settings.min_liquidity_ratio ?? 1.2, current: kpis.liquidity, fmt: (n: number) => n.toFixed(2) + "x", lower: false, action: "Protect cash, align disbursements to funding and activate contingency lines." },
    { area: "NPL", measure: "NPL Ratio", target: settings.npl_threshold ?? 0.08, current: kpis.npl, fmt: pct, lower: true, action: "Escalate to recovery, intensify legal follow-up, review provisioning." },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">Executive Traffic-Light Summary</div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr><th className="text-left p-3">Area</th><th className="text-left p-3">Measure</th><th className="text-left p-3">Target</th><th className="text-left p-3">Current</th><th className="text-left p-3">Status</th><th className="text-left p-3">Management Action</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = status(r.current, r.target, r.lower);
            return (
              <tr key={r.measure} className="border-t border-slate-100">
                <td className="p-3 font-medium">{r.area}</td>
                <td className="p-3">{r.measure}</td>
                <td className="p-3">{r.fmt(r.target)}</td>
                <td className="p-3">{r.fmt(r.current)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.tone}`}>{s.label}</span></td>
                <td className="p-3 text-slate-600">{r.action}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendTable({ months, currency }: { months: any[]; currency: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="font-semibold text-slate-900">Monthly Financial Trend</div>
        <a href="/performance/new" className="text-sm text-[#1E3A5F] hover:underline">Add month</a>
      </div>
      {months.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No monthly entries yet. Add monthly P&L, portfolio and ratios to populate the dashboard.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Period</th><th className="text-right p-3">Revenue</th><th className="text-right p-3">Net Profit</th>
                <th className="text-right p-3">Portfolio</th><th className="text-right p-3">Collections</th>
                <th className="text-right p-3">PAR30</th><th className="text-right p-3">NPL</th><th className="text-right p-3">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="p-3">{m.period}</td>
                  <td className="p-3 text-right">{fmt(Number(m.revenue), currency)}</td>
                  <td className="p-3 text-right">{fmt(Number(m.net_profit), currency)}</td>
                  <td className="p-3 text-right">{fmt(Number(m.closing_portfolio), currency)}</td>
                  <td className="p-3 text-right">{fmt(Number(m.collections), currency)}</td>
                  <td className="p-3 text-right">{pct(Number(m.par30))}</td>
                  <td className="p-3 text-right">{pct(Number(m.npl_ratio))}</td>
                  <td className="p-3 text-right">{Number(m.liquidity_ratio).toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BranchesTable({ rows }: { rows: any[] }) {
  const [name, setName] = useState(""); const [location, setLocation] = useState(""); const [manager, setManager] = useState("");
  const add = async () => {
    if (!name) return;
    const { error } = await supabase.from("branches").insert({ name, location, manager } as any);
    if (error) toast.error(error.message); else { toast.success("Branch added"); setName(""); setLocation(""); setManager(""); window.location.reload(); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">Branches</div>
      <div className="p-3 grid grid-cols-4 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-9 px-2 border border-slate-200 rounded text-sm" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="h-9 px-2 border border-slate-200 rounded text-sm" />
        <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Manager" className="h-9 px-2 border border-slate-200 rounded text-sm" />
        <button onClick={add} className="h-9 rounded bg-[#1E3A5F] text-white text-sm">Add</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Location</th><th className="text-left p-3">Manager</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={3} className="p-4 text-slate-500">No branches yet.</td></tr>
            : rows.map((b) => <tr key={b.id} className="border-t border-slate-100"><td className="p-3">{b.name}</td><td className="p-3">{b.location ?? "—"}</td><td className="p-3">{b.manager ?? "—"}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function OfficersTable({ rows, currency }: { rows: any[]; currency: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">Officer Scorecards</div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>
          <th className="text-left p-3">Name</th><th className="text-left p-3">Role</th>
          <th className="text-right p-3">Portfolio</th><th className="text-right p-3">Collections</th><th className="text-right p-3">PAR</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={5} className="p-4 text-slate-500">No officers tracked yet.</td></tr>
            : rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="p-3">{o.name}</td><td className="p-3">{o.role ?? "—"}</td>
                <td className="p-3 text-right">{fmt(Number(o.portfolio_actual), currency)} / {fmt(Number(o.portfolio_target), currency)}</td>
                <td className="p-3 text-right">{fmt(Number(o.collections_actual), currency)} / {fmt(Number(o.collections_target), currency)}</td>
                <td className="p-3 text-right">{pct(Number(o.par_actual))}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function AssumptionsForm({ settings, onSaved }: { settings: any; onSaved: () => void }) {
  const { hasRole, tenant } = useAuth();
  const canEdit = hasRole("super_admin");
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  const save = async () => {
    const { error } = await supabase.from("tenant_settings").update({
      avg_project_size: form.avg_project_size, max_ltv: form.max_ltv,
      annual_interest_rate: form.annual_interest_rate, processing_fee_rate: form.processing_fee_rate,
      insurance_fee_rate: form.insurance_fee_rate, standard_tenor_years: form.standard_tenor_years,
      par30_threshold: form.par30_threshold, npl_threshold: form.npl_threshold,
      collection_efficiency_target: form.collection_efficiency_target,
      min_liquidity_ratio: form.min_liquidity_ratio, min_capital_adequacy: form.min_capital_adequacy,
      roe_target: form.roe_target, current_year: form.current_year, currency: form.currency,
    }).eq("tenant_id", tenant!.id);
    if (error) toast.error(error.message); else { toast.success("Assumptions saved"); onSaved(); }
  };
  if (!settings) return null;
  const F = ({ k, label, step = "0.01" }: { k: string; label: string; step?: string }) => (
    <label className="text-sm space-y-1">
      <span className="text-slate-600">{label}</span>
      <input type="number" step={step} value={form[k] ?? ""} disabled={!canEdit}
        onChange={(e) => setForm({ ...form, [k]: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-full h-9 px-2 border border-slate-200 rounded disabled:bg-slate-50" />
    </label>
  );
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-slate-900">Assumptions & Scenario Inputs</div>
        {canEdit && <button onClick={save} className="h-9 px-3 rounded bg-[#1E3A5F] text-white text-sm">Save</button>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <F k="avg_project_size" label="Average Project Size" step="1000" />
        <F k="max_ltv" label="Max LTV" />
        <F k="annual_interest_rate" label="Annual Interest Rate" />
        <F k="processing_fee_rate" label="Processing Fee Rate" />
        <F k="insurance_fee_rate" label="Insurance Fee Rate" />
        <F k="standard_tenor_years" label="Standard Tenor (years)" step="1" />
        <F k="par30_threshold" label="PAR30 Threshold" />
        <F k="npl_threshold" label="NPL Threshold" />
        <F k="collection_efficiency_target" label="Collection Eff. Target" />
        <F k="min_liquidity_ratio" label="Min Liquidity Ratio" />
        <F k="min_capital_adequacy" label="Min Capital Adequacy" />
        <F k="roe_target" label="ROE Target" />
      </div>
    </div>
  );
}
