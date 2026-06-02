import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PrintShell, KV } from "@/components/PrintShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/payments/$id/receipt")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin", "finance", "finance_officer"]}>
      <Receipt />
    </ProtectedRoute>
  ),
});

function Receipt() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["payment-receipt", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, beneficiary:beneficiaries(*), drawdown:drawdown_requests(id, certified_amount, loan_id, loan:loan_facilities(account_number, customer:customers(name), project:projects(name)))")
        .eq("id", id)
        .single();
      return data as any;
    },
  });

  if (isLoading || !data) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl m-6" />;
  const p = data;
  const receiptNo = `RCP-${String(p.id).slice(0, 8).toUpperCase()}`;
  const loan = p.drawdown?.loan;

  return (
    <PrintShell
      title="Payment Receipt"
      subtitle={`Receipt No: ${receiptNo}`}
      backTo={`/payments/${id}`}
      backLabel="Back to payment"
    >
      <div className="grid grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Beneficiary</h3>
          <div className="text-base font-semibold text-slate-900">{p.beneficiary?.name ?? "—"}</div>
          <div className="text-sm text-slate-600">{p.beneficiary?.bank_name ?? ""}</div>
          <div className="text-sm text-slate-600">A/C: {p.beneficiary?.account_number ?? "—"}</div>
          {p.beneficiary?.mobile_wallet && <div className="text-sm text-slate-600">Mobile: {p.beneficiary.mobile_wallet}</div>}
        </section>
        <section>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Payment details</h3>
          <KV k="Receipt No." v={receiptNo} />
          <KV k="Date" v={formatDate(p.created_at)} />
          <KV k="Status" v={<span className="uppercase text-xs">{p.status}</span>} />
        </section>
      </div>

      {loan && (
        <section className="mb-6">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Linked facility</h3>
          <KV k="Customer" v={loan.customer?.name} />
          <KV k="Project" v={loan.project?.name} />
          <KV k="Account #" v={loan.account_number} />
          {p.drawdown && <KV k="Drawdown certified" v={formatKES(p.drawdown.certified_amount)} />}
        </section>
      )}

      <section className="mt-8 border-t-2 border-slate-900 pt-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs uppercase text-slate-500">Purpose</div>
            <div className="text-sm text-slate-800 mt-1 max-w-md">{p.purpose ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-slate-500">Amount paid</div>
            <div className="text-3xl font-bold text-slate-900">{formatKES(p.amount)}</div>
          </div>
        </div>
      </section>
    </PrintShell>
  );
}
