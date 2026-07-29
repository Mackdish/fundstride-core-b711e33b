import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/payments/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin","executive","finance","finance_officer"]}>
      <NewPayment />
    </ProtectedRoute>
  ),
});

function NewPayment() {
  const nav = useNavigate();
  const { user } = useAuth();

  const { data: loans } = useQuery({
    queryKey: ["pay-loans"],
    queryFn: async () => (await supabase.from("loan_facilities").select("id,account_number,customer:customers(name),project:projects(id,name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: beneficiaries } = useQuery({
    queryKey: ["pay-beneficiaries"],
    queryFn: async () => (await supabase.from("beneficiaries").select("id,name,bank_name").order("name")).data ?? [],
  });
  const { data: drawdowns } = useQuery({
    queryKey: ["pay-drawdowns"],
    queryFn: async () => (await supabase.from("drawdown_requests").select("id,certified_amount,loan_id,status").order("created_at", { ascending: false })).data ?? [],
  });

  const [f, setF] = useState<any>({
    loan_id: "", drawdown_id: "", beneficiary_id: "",
    amount: "", purpose: "", payment_date: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);

  // Auto-fill amount when drawdown selected
  useEffect(() => {
    if (f.drawdown_id) {
      const d = drawdowns?.find((x: any) => x.id === f.drawdown_id);
      if (d?.certified_amount && !f.amount) setF((p: any) => ({ ...p, amount: d.certified_amount, loan_id: d.loan_id ?? p.loan_id }));
    }
  }, [f.drawdown_id, drawdowns]);

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.amount || Number(f.amount) <= 0) return toast.error("Amount must be greater than zero");
    setBusy(true);
    try {
      const { data, error } = await supabase.from("payments").insert({
        amount: Number(f.amount),
        purpose: f.purpose || null,
        drawdown_id: f.drawdown_id || null,
        beneficiary_id: f.beneficiary_id || null,
        status: "pending",
        created_by: user?.id,
      }).select("id").single();
      if (error) throw error;
      await logAudit("create", "payment", data.id, null, f);
      toast.success("Payment created — awaiting authorization");
      nav({ to: "/payments/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setBusy(false); }
  };

  const filteredDrawdowns = (drawdowns ?? []).filter((d: any) => !f.loan_id || d.loan_id === f.loan_id);

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New payment" description="Create a manual payment record. It will enter the dual-authorization queue." />
      <Section title="Payment details">
        <Field label="Loan facility">
          <select className={fieldCls} value={f.loan_id} onChange={set("loan_id")}>
            <option value="">— Not linked —</option>
            {loans?.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.customer?.name ?? "Unknown"} · {l.project?.name ?? l.account_number ?? l.id.slice(0,8)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Linked drawdown (optional)">
          <select className={fieldCls} value={f.drawdown_id} onChange={set("drawdown_id")}>
            <option value="">— None —</option>
            {filteredDrawdowns.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.id.slice(0,8)} · {d.certified_amount ? `KES ${Number(d.certified_amount).toLocaleString()}` : "n/a"} · {d.status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beneficiary">
          <select className={fieldCls} value={f.beneficiary_id} onChange={set("beneficiary_id")}>
            <option value="">— Select beneficiary —</option>
            {beneficiaries?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}{b.bank_name ? ` · ${b.bank_name}` : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount (KES) *">
          <input type="number" step="0.01" className={fieldCls} value={f.amount} onChange={set("amount")} />
        </Field>
        <Field label="Payment date">
          <input type="date" className={fieldCls} value={f.payment_date} onChange={set("payment_date")} />
        </Field>
        <Field label="Purpose / description" className="sm:col-span-2">
          <textarea className={fieldCls + " h-20 py-2"} value={f.purpose} onChange={set("purpose")} placeholder="e.g. Foundation works — milestone 1" />
        </Field>
      </Section>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => nav({ to: "/payments" })} className="h-10 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
        <button type="submit" disabled={busy} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Create payment"}
        </button>
      </div>
    </form>
  );
}
