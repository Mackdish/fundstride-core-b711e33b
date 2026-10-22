import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, Plus, ChevronDown } from "lucide-react";
import { formatDate, formatKES } from "@/lib/format";
import {
  getCustomerProjectFinancialSummary,
  recordProjectCustomerContribution,
} from "@/lib/project-financials.functions";

type ContributionMethod = "cash" | "bank_transfer" | "mobile_money" | "cheque" | "other";

export function ProjectFinancialSummary({
  projectId,
  canRecordContribution = false,
}: {
  projectId: string;
  canRecordContribution?: boolean;
}) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ContributionMethod>("mobile_money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const queryKey = ["project-financial-summary", projectId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getCustomerProjectFinancialSummary({ data: { project_id: projectId } }),
  });

  const contributionMutation = useMutation({
    mutationFn: () => recordProjectCustomerContribution({
      data: {
        project_id: projectId,
        amount: Number(amount),
        contribution_date: date,
        method,
        reference: reference.trim(),
        notes: notes.trim(),
        status,
      },
    }),
    onSuccess: async () => {
      toast.success("Customer contribution recorded");
      setAmount("");
      setReference("");
      setNotes("");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Unable to record contribution"),
  });

  if (isLoading) return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading financial summary…</div>;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Financial summary</h3>
        <p className="mt-2 text-sm text-slate-500">
          Financial details are available only to the linked customer account and authorized finance staff.
        </p>
      </div>
    );
  }

  const totals = data.totals;
  const cards = [
    { label: "Registered project value", value: data.project.expected_value },
    { label: "Requested financing", value: totals.requestedFinancing },
    { label: "Approved / activated financing", value: totals.approvedFinancing },
    { label: "Confirmed customer contributions", value: totals.confirmedContributions },
    { label: "Completed payments", value: totals.completedPayments },
    { label: "Repayments recorded", value: totals.totalRepayments },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Financial summary
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Authorized financial records for {data.project.name}. Amounts are shown in KES.
          </p>
        </div>
        {canRecordContribution && (
          <button
            type="button"
            onClick={() => setFormOpen((value) => !value)}
            className="shrink-0 h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Record contribution
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatKES(card.value)}</p>
          </div>
        ))}
      </div>

      {formOpen && canRecordContribution && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h4 className="font-medium text-slate-900">Record customer contribution</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Amount (KES)
              <input type="number" min="0.01" step="0.01" value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700">
              Contribution date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700">
              Method
              <select value={method} onChange={(event) => setMethod(event.target.value as ContributionMethod)}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option value="mobile_money">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Record status
              <select value={status} onChange={(event) => setStatus(event.target.value as "pending" | "confirmed")}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending verification</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Reference (optional)
              <input value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Notes (optional)
              <textarea value={notes} maxLength={2000} rows={2} onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white p-3" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} disabled={contributionMutation.isPending}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm">Cancel</button>
            <button type="button" disabled={contributionMutation.isPending || !(Number(amount) > 0) || !date}
              onClick={() => contributionMutation.mutate()}
              className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-50">
              {contributionMutation.isPending ? "Saving…" : "Save contribution"}
            </button>
          </div>
        </div>
      )}

      <FinancialSection title="Financing requests" count={data.appraisals.length}>
        {data.appraisals.map((item: any) => (
          <FinancialRow key={item.id} label={`Request · ${item.status}`} date={item.created_at}
            amount={item.requested_amount} detail={item.recommended_amount ? `Recommended: ${formatKES(item.recommended_amount)}` : undefined} />
        ))}
      </FinancialSection>

      <FinancialSection title="Loan facilities" count={data.loans.length}>
        {data.loans.map((item: any) => (
          <FinancialRow key={item.id} label={`Facility · ${item.status}`} date={item.activated_at ?? item.created_at}
            amount={item.approved_amount} detail={`${item.interest_rate ?? "—"}% · ${item.tenor_months ?? "—"} months`} />
        ))}
      </FinancialSection>

      <FinancialSection title="Drawdown history" count={data.drawdowns.length}>
        {data.drawdowns.map((item: any) => (
          <FinancialRow key={item.id} label={`Drawdown · ${item.status}`} date={item.created_at}
            amount={item.certified_amount ?? item.requested_amount}
            detail={`Requested: ${formatKES(item.requested_amount)} · Certified: ${formatKES(item.certified_amount)}`} />
        ))}
      </FinancialSection>

      <FinancialSection title="Payment history" count={data.payments.length}>
        {data.payments.map((item: any) => (
          <FinancialRow key={item.id} label={item.purpose || `Payment · ${item.status}`} date={item.created_at}
            amount={item.amount} detail={`Status: ${item.status}`} />
        ))}
      </FinancialSection>

      <FinancialSection title="Repayment history" count={data.repayments.length}>
        {data.repayments.map((item: any) => (
          <FinancialRow key={item.id} label={`Repayment · ${item.source || "recorded"}`} date={item.payment_date}
            amount={item.amount}
            detail={`Principal: ${formatKES(item.allocation_principal)} · Interest: ${formatKES(item.allocation_interest)}${item.reference ? ` · Ref: ${item.reference}` : ""}`} />
        ))}
      </FinancialSection>

      <FinancialSection title="Customer contributions" count={data.contributions.length}>
        {data.contributions.map((item: any) => (
          <FinancialRow key={item.id} label={`Contribution · ${item.method}`} date={item.contribution_date}
            amount={item.amount} detail={`Status: ${item.status}${item.reference ? ` · Ref: ${item.reference}` : ""}`} />
        ))}
      </FinancialSection>
    </section>
  );
}

function FinancialSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details className="rounded-lg border border-slate-200" open={count > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-slate-800">
        <span>{title} <span className="text-slate-400 font-normal">({count})</span></span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </summary>
      <div className="border-t border-slate-100 px-3">
        {count === 0 ? <p className="py-3 text-sm text-slate-500">No records available.</p> : children}
      </div>
    </details>
  );
}

function FinancialRow({
  label, date, amount, detail,
}: {
  label: string;
  date?: string | null;
  amount?: number | string | null;
  detail?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {detail && <p className="mt-1 text-xs text-slate-500 break-words">{detail}</p>}
      </div>
      <div className="shrink-0 sm:text-right">
        <p className="text-sm font-semibold text-slate-900">{formatKES(amount == null ? amount : Number(amount))}</p>
        <p className="mt-1 text-xs text-slate-400">{date ? formatDate(date) : "—"}</p>
      </div>
    </div>
  );
}
