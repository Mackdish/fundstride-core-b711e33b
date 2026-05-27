import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/customers/new")({
  component: () => <ProtectedRoute><NewCustomerWizard /></ProtectedRoute>,
});

const schema = z.object({
  name: z.string().min(2, "Required"),
  customer_type: z.enum(["corporate", "individual"]),
  pin: z.string().min(5, "Required"),
  registration_number: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(7, "Required"),
  address: z.string().optional(),
  sector: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STEPS = ["Company Info", "Directors", "KYC Documents", "Financial", "Review"];

function NewCustomerWizard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [directors, setDirectors] = useState<{ name: string; shareholding_pct: number }[]>([{ name: "", shareholding_pct: 100 }]);
  const totalShare = directors.reduce((s, d) => s + Number(d.shareholding_pct || 0), 0);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customer_type: "corporate" },
  });

  const onSubmit = async (values: FormData) => {
    if (totalShare !== 100) { toast.error("Beneficial ownership must total 100%"); return; }
    const { data, error } = await supabase.from("customers").insert({
      ...values, status: "pending", created_by: user?.id, owner_user_id: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from("customer_directors").insert(directors.filter(d => d.name).map(d => ({ ...d, customer_id: data.id })));
      await logAudit("create", "customer", data.id, null, values);
      toast.success("Customer submitted for review");
      nav({ to: `/customers/${data.id}` });
    }
  };

  return (
    <>
      <PageHeader title="New customer" description="Onboard a corporate or individual borrower." />
      <div className="max-w-4xl">
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${i <= step ? "bg-[#1E3A5F] text-white" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className={`ml-2 text-xs ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>{s}</div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? "bg-[#1E3A5F]" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Legal name" error={errors.name?.message}><input {...register("name")} className={inputCls} /></Field>
              <Field label="Type"><select {...register("customer_type")} className={inputCls}><option value="corporate">Corporate</option><option value="individual">Individual</option></select></Field>
              <Field label="KRA PIN" error={errors.pin?.message}><input {...register("pin")} className={inputCls} /></Field>
              <Field label="Registration Number"><input {...register("registration_number")} className={inputCls} /></Field>
              <Field label="Email" error={errors.email?.message}><input type="email" {...register("email")} className={inputCls} /></Field>
              <Field label="Phone" error={errors.phone?.message}><input {...register("phone")} className={inputCls} /></Field>
              <Field label="Address"><input {...register("address")} className={inputCls} /></Field>
              <Field label="Sector"><input {...register("sector")} placeholder="Real estate, mixed-use…" className={inputCls} /></Field>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Directors & beneficial ownership</div>
                <div className={`text-xs font-medium ${totalShare === 100 ? "text-emerald-600" : "text-red-600"}`}>Total: {totalShare}% {totalShare === 100 ? "✓" : "(must equal 100%)"}</div>
              </div>
              {directors.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input placeholder="Director name" value={d.name} onChange={(e) => { const c = [...directors]; c[i].name = e.target.value; setDirectors(c); }} className={`${inputCls} col-span-8`} />
                  <input type="number" placeholder="%" value={d.shareholding_pct} onChange={(e) => { const c = [...directors]; c[i].shareholding_pct = Number(e.target.value); setDirectors(c); }} className={`${inputCls} col-span-3`} />
                  <button type="button" onClick={() => setDirectors(directors.filter((_, j) => j !== i))} className="col-span-1 text-red-500 text-sm">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setDirectors([...directors, { name: "", shareholding_pct: 0 }])} className="text-sm text-[#1E3A5F] hover:underline">+ Add director</button>
            </div>
          )}
          {step === 2 && <DocStep />}
          {step === 3 && <div className="text-sm text-slate-600">Financial profile capture (turnover, profitability, existing facilities) — to be completed in next iteration.</div>}
          {step === 4 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Review</div>
              <pre className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs overflow-auto">{JSON.stringify({ ...getValues(), directors }, null, 2)}</pre>
              <ChecklistItem ok={!!getValues("name")}>Company info captured</ChecklistItem>
              <ChecklistItem ok={totalShare === 100}>Beneficial ownership = 100%</ChecklistItem>
              <ChecklistItem ok>KYC documents acknowledged</ChecklistItem>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="h-9 px-4 rounded-md border border-slate-200 text-sm disabled:opacity-50">Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm">Next</button>
            ) : (
              <button onClick={handleSubmit(onSubmit)} className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm">Submit for review</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const inputCls = "h-10 w-full px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30";
function Field({ label, error, children }: any) {
  return <div><label className="text-sm text-slate-700">{label}</label>{children}{error && <div className="text-xs text-red-600 mt-1">{error}</div>}</div>;
}
function ChecklistItem({ ok, children }: any) {
  return <div className={`flex items-center gap-2 text-sm ${ok ? "text-emerald-700" : "text-red-600"}`}>{ok ? "✓" : "✗"} {children}</div>;
}
function DocStep() {
  return <div className="text-sm text-slate-600">Upload KYC documents (Certificate of Incorporation, CR12, Tax Compliance, IDs). Document uploader will be enabled once customer is saved.</div>;
}
