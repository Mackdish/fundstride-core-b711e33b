import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PrintShell, KV } from "@/components/PrintShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate, formatPct } from "@/lib/format";

export const Route = createFileRoute("/loans/$id/repayment-schedule")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin", "finance", "credit", "executive", "credit_officer", "finance_officer"]}>
      <RepaymentSchedule />
    </ProtectedRoute>
  ),
});

function RepaymentSchedule() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["loan-repay-schedule", id],
    queryFn: async () => {
      const [l, sched] = await Promise.all([
        supabase.from("loan_facilities").select("*, customer:customers(name), project:projects(name), appraisal:appraisals(customer:customers(name), project:projects(name))").eq("id", id).single(),
        supabase.from("repayment_schedules").select("*").eq("loan_id", id).order("instalment_date"),
      ]);
      return { l: l.data as any, sched: sched.data ?? [] };
    },
  });

  if (isLoading || !data?.l) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl m-6" />;
  const l = data.l;
  const cust = l.customer ?? l.appraisal?.customer;
  const proj = l.project ?? l.appraisal?.project;

  const totalPrincipal = data.sched.reduce((s: number, r: any) => s + Number(r.principal ?? 0), 0);
  const totalInterest = data.sched.reduce((s: number, r: any) => s + Number(r.interest ?? 0), 0);
  const totalDue = data.sched.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);

  return (
    <PrintShell
      title="Loan Repayment Schedule"
      subtitle={`A/C ${l.account_number ?? id.slice(0, 8)}`}
      backTo={`/loans/${id}`}
      backLabel="Back to loan"
    >
      <div className="grid grid-cols-2 gap-6 mb-6">
        <section>
          <KV k="Borrower" v={cust?.name} />
          <KV k="Project" v={proj?.name} />
        </section>
        <section>
          <KV k="Approved amount" v={formatKES(l.approved_amount)} />
          <KV k="Interest rate" v={formatPct(l.interest_rate)} />
          <KV k="Tenor" v={`${l.tenor_months} months`} />
          <KV k="Frequency" v={l.repayment_frequency} />
        </section>
      </div>

      <table className="w-full text-xs border border-slate-200">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Due date</th>
            <th className="px-2 py-1.5 text-right">Principal</th>
            <th className="px-2 py-1.5 text-right">Interest</th>
            <th className="px-2 py-1.5 text-right">Instalment</th>
            <th className="px-2 py-1.5 text-right">Balance</th>
            <th className="px-2 py-1.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.sched.length === 0 && (
            <tr><td className="px-2 py-3 text-center text-slate-500" colSpan={7}>Schedule will populate on activation.</td></tr>
          )}
          {data.sched.map((r: any, i: number) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5">{formatDate(r.instalment_date)}</td>
              <td className="px-2 py-1.5 text-right">{formatKES(r.principal)}</td>
              <td className="px-2 py-1.5 text-right">{formatKES(r.interest)}</td>
              <td className="px-2 py-1.5 text-right font-medium">{formatKES(r.total)}</td>
              <td className="px-2 py-1.5 text-right">{formatKES(r.balance)}</td>
              <td className="px-2 py-1.5 uppercase text-[10px]">{r.status}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr>
            <td className="px-2 py-1.5" colSpan={2}>Totals</td>
            <td className="px-2 py-1.5 text-right">{formatKES(totalPrincipal)}</td>
            <td className="px-2 py-1.5 text-right">{formatKES(totalInterest)}</td>
            <td className="px-2 py-1.5 text-right">{formatKES(totalDue)}</td>
            <td className="px-2 py-1.5" colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </PrintShell>
  );
}
