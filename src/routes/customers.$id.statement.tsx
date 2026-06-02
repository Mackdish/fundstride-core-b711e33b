import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PrintShell, KV } from "@/components/PrintShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/customers/$id/statement")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin", "finance", "credit", "executive", "credit_officer", "finance_officer"]}>
      <CustomerStatement />
    </ProtectedRoute>
  ),
});

function CustomerStatement() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-statement", id],
    queryFn: async () => {
      const { data: c } = await supabase.from("customers").select("*").eq("id", id).single();
      const { data: loans } = await supabase.from("loan_facilities").select("id,account_number,approved_amount,status,interest_rate,tenor_months,activated_at,project:projects(name)").eq("customer_id", id);
      const loanIds = (loans ?? []).map((l: any) => l.id);
      let drawdowns: any[] = [], repayments: any[] = [];
      if (loanIds.length) {
        const [dd, rp] = await Promise.all([
          supabase.from("drawdown_requests").select("*").in("loan_id", loanIds),
          supabase.from("repayments").select("*").in("loan_id", loanIds),
        ]);
        drawdowns = dd.data ?? [];
        repayments = rp.data ?? [];
      }
      return { c: c as any, loans: loans ?? [], drawdowns, repayments };
    },
  });

  if (isLoading || !data?.c) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl m-6" />;
  const { c, loans, drawdowns, repayments } = data;

  const totalApproved = loans.reduce((s: number, l: any) => s + Number(l.approved_amount ?? 0), 0);
  const totalDisbursed = drawdowns.filter((d: any) => d.status === "completed" || d.status === "active").reduce((s: number, d: any) => s + Number(d.certified_amount ?? 0), 0);
  const totalRepaid = repayments.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
  const principalRepaid = repayments.reduce((s: number, r: any) => s + Number(r.allocation_principal ?? 0), 0);
  const outstanding = totalDisbursed - principalRepaid;

  return (
    <PrintShell
      title="Customer Statement"
      subtitle={c.name}
      backTo={`/customers/${id}`}
      backLabel="Back to customer"
    >
      <div className="grid grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Customer</h3>
          <div className="text-base font-semibold text-slate-900">{c.name}</div>
          <div className="text-sm text-slate-600">{c.email ?? ""}</div>
          <div className="text-sm text-slate-600">{c.phone ?? c.mobile ?? ""}</div>
          <div className="text-sm text-slate-600">{c.address ?? ""}</div>
        </section>
        <section>
          <KV k="Customer type" v={c.customer_type} />
          <KV k="KRA PIN" v={c.pin} />
          <KV k="Registration #" v={c.registration_number} />
          <KV k="Statement date" v={new Date().toLocaleDateString("en-GB")} />
        </section>
      </div>

      <section className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Approved" value={formatKES(totalApproved)} />
        <Stat label="Disbursed" value={formatKES(totalDisbursed)} />
        <Stat label="Repaid" value={formatKES(totalRepaid)} />
        <Stat label="Outstanding" value={formatKES(outstanding)} accent />
      </section>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Facilities</h3>
        <table className="w-full text-xs border border-slate-200">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-2 py-1.5">A/C</th>
              <th className="px-2 py-1.5">Project</th>
              <th className="px-2 py-1.5 text-right">Approved</th>
              <th className="px-2 py-1.5">Rate</th>
              <th className="px-2 py-1.5">Tenor</th>
              <th className="px-2 py-1.5">Activated</th>
              <th className="px-2 py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-center text-slate-500">No facilities.</td></tr>}
            {loans.map((l: any) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono text-[10px]">{l.account_number ?? l.id.slice(0, 8)}</td>
                <td className="px-2 py-1.5">{l.project?.name ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{formatKES(l.approved_amount)}</td>
                <td className="px-2 py-1.5">{l.interest_rate ? `${l.interest_rate}%` : "—"}</td>
                <td className="px-2 py-1.5">{l.tenor_months ? `${l.tenor_months}m` : "—"}</td>
                <td className="px-2 py-1.5">{formatDate(l.activated_at)}</td>
                <td className="px-2 py-1.5 uppercase text-[10px]">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Recent repayments</h3>
        <table className="w-full text-xs border border-slate-200">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-2 py-1.5">Date</th>
              <th className="px-2 py-1.5">Ref</th>
              <th className="px-2 py-1.5">Source</th>
              <th className="px-2 py-1.5 text-right">Principal</th>
              <th className="px-2 py-1.5 text-right">Interest</th>
              <th className="px-2 py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {repayments.length === 0 && <tr><td colSpan={6} className="px-2 py-3 text-center text-slate-500">No repayments recorded.</td></tr>}
            {repayments.slice().sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5">{formatDate(r.payment_date)}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">{r.reference ?? "—"}</td>
                <td className="px-2 py-1.5">{r.source ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{formatKES(r.allocation_principal)}</td>
                <td className="px-2 py-1.5 text-right">{formatKES(r.allocation_interest)}</td>
                <td className="px-2 py-1.5 text-right font-medium">{formatKES(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PrintShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${accent ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-slate-50 border-slate-200"}`}>
      <div className={`text-[10px] uppercase tracking-wide ${accent ? "text-white/70" : "text-slate-500"}`}>{label}</div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
  );
}
