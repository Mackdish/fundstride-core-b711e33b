import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PrintShell, KV } from "@/components/PrintShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate, formatPct } from "@/lib/format";

export const Route = createFileRoute("/loans/$id/statement")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin", "finance", "credit", "executive", "credit_officer", "finance_officer"]}>
      <LoanStatement />
    </ProtectedRoute>
  ),
});

function LoanStatement() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["loan-statement", id],
    queryFn: async () => {
      const [l, dd, rep, led] = await Promise.all([
        supabase.from("loan_facilities").select("*, customer:customers(name,email,phone,address), project:projects(name,location), appraisal:appraisals(customer:customers(name), project:projects(name,location))").eq("id", id).single(),
        supabase.from("drawdown_requests").select("*").eq("loan_id", id).order("created_at"),
        supabase.from("repayments").select("*").eq("loan_id", id).order("payment_date"),
        supabase.from("ledger_entries").select("*").eq("loan_id", id).order("created_at"),
      ]);
      return { l: l.data as any, dd: dd.data ?? [], rep: rep.data ?? [], led: led.data ?? [] };
    },
  });

  if (isLoading || !data?.l) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl m-6" />;
  const l = data.l;
  const cust = l.customer ?? l.appraisal?.customer;
  const proj = l.project ?? l.appraisal?.project;

  const disbursed = data.dd.filter((d: any) => d.status === "completed" || d.status === "active").reduce((s: number, d: any) => s + Number(d.certified_amount ?? 0), 0);
  const totalPaid = data.rep.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
  const principalPaid = data.rep.reduce((s: number, r: any) => s + Number(r.allocation_principal ?? 0), 0);
  const interestPaid = data.rep.reduce((s: number, r: any) => s + Number(r.allocation_interest ?? 0), 0);
  const outstanding = disbursed - principalPaid;

  // Build transaction list
  type Tx = { date: string; ref: string; desc: string; debit: number; credit: number; balance: number };
  const txs: Tx[] = [];
  data.dd.forEach((d: any) => {
    if (d.status === "completed" || d.status === "active") {
      txs.push({ date: d.created_at, ref: `DD-${String(d.id).slice(0, 6).toUpperCase()}`, desc: "Disbursement", debit: Number(d.certified_amount ?? 0), credit: 0, balance: 0 });
    }
  });
  data.rep.forEach((r: any) => {
    txs.push({ date: r.payment_date, ref: r.reference ?? `RP-${String(r.id).slice(0, 6).toUpperCase()}`, desc: `Repayment (${r.source ?? "manual"})`, debit: 0, credit: Number(r.amount ?? 0), balance: 0 });
  });
  txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let bal = 0;
  txs.forEach((t) => { bal += t.debit - t.credit; t.balance = bal; });

  return (
    <PrintShell
      title="Loan Statement"
      subtitle={`A/C ${l.account_number ?? id.slice(0, 8)}`}
      backTo={`/loans/${id}`}
      backLabel="Back to loan"
    >
      <div className="grid grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Borrower</h3>
          <div className="text-base font-semibold text-slate-900">{cust?.name ?? "—"}</div>
          <div className="text-sm text-slate-600">{cust?.email ?? ""}</div>
          <div className="text-sm text-slate-600">{cust?.phone ?? ""}</div>
          <div className="text-sm text-slate-600">{cust?.address ?? ""}</div>
        </section>
        <section>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Facility</h3>
          <KV k="Product" v={l.product_type ?? "—"} />
          <KV k="Project" v={proj?.name ?? "—"} />
          <KV k="Status" v={<span className="uppercase text-xs">{l.status}</span>} />
          <KV k="Activated" v={formatDate(l.activated_at)} />
        </section>
      </div>

      <section className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Approved" value={formatKES(l.approved_amount)} />
        <Stat label="Disbursed" value={formatKES(disbursed)} />
        <Stat label="Rate · Tenor" value={`${formatPct(l.interest_rate)} · ${l.tenor_months}m`} />
        <Stat label="Outstanding" value={formatKES(outstanding)} accent />
      </section>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Account activity</h3>
        <table className="w-full text-xs border border-slate-200">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-2 py-1.5">Date</th>
              <th className="px-2 py-1.5">Ref</th>
              <th className="px-2 py-1.5">Description</th>
              <th className="px-2 py-1.5 text-right">Debit</th>
              <th className="px-2 py-1.5 text-right">Credit</th>
              <th className="px-2 py-1.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && (
              <tr><td className="px-2 py-3 text-center text-slate-500" colSpan={6}>No activity yet.</td></tr>
            )}
            {txs.map((t, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1.5">{formatDate(t.date)}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">{t.ref}</td>
                <td className="px-2 py-1.5">{t.desc}</td>
                <td className="px-2 py-1.5 text-right">{t.debit ? formatKES(t.debit) : ""}</td>
                <td className="px-2 py-1.5 text-right">{t.credit ? formatKES(t.credit) : ""}</td>
                <td className="px-2 py-1.5 text-right font-medium">{formatKES(t.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-2 py-1.5" colSpan={3}>Totals</td>
              <td className="px-2 py-1.5 text-right">{formatKES(disbursed)}</td>
              <td className="px-2 py-1.5 text-right">{formatKES(totalPaid)}</td>
              <td className="px-2 py-1.5 text-right">{formatKES(outstanding)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grid grid-cols-3 gap-3 mb-2">
        <Stat label="Principal repaid" value={formatKES(principalPaid)} />
        <Stat label="Interest paid" value={formatKES(interestPaid)} />
        <Stat label="Total paid" value={formatKES(totalPaid)} />
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
