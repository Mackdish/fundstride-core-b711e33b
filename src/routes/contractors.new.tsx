import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/contractors/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "operations_officer", "credit_officer"]}>
      <NewContractor />
    </ProtectedRoute>
  ),
});

const SERVICES = [
  "Architectural Design", "Structural Design", "Civil Engineering Design",
  "Electrical Engineering", "Mechanical Engineering", "Environmental Impact Assessment",
  "Interior Design", "Landscaping", "BOQ Preparation", "Cost Planning",
  "Tender Documentation", "Valuation Services", "Project Management",
  "Site Supervision", "End to end Construction",
];

const schema = z.object({
  // Section 1
  name: z.string().min(2, "Required"),
  trading_name: z.string().optional(),
  consultancy_type: z.string().min(2, "Required"),
  registration_number: z.string().optional(),
  kra_pin: z.string().optional(),
  vat_number: z.string().optional(),
  nca_registration: z.string().optional(),
  nca_category: z.string().optional(),
  professional_body_number: z.string().optional(),
  year_established: z.coerce.number().int().min(1900).max(2100).optional(),
  country_of_incorporation: z.string().optional(),
  // Section 2
  physical_address: z.string().optional(),
  postal_address: z.string().optional(),
  town: z.string().optional(),
  phone: z.string().min(7, "Required"),
  alt_phone: z.string().optional(),
  email: z.string().email("Invalid email"),
  website: z.string().optional(),
  // Section 3 - primary contact
  pc_name: z.string().optional(),
  pc_designation: z.string().optional(),
  pc_mobile: z.string().optional(),
  pc_email: z.string().optional(),
  // Section 4
  services: z.array(z.string()).optional(),
  services_other: z.string().optional(),
  // Section 5
  rp_name: z.string().optional(),
  rp_client: z.string().optional(),
  rp_value: z.string().optional(),
  rp_role: z.string().optional(),
  rp_year: z.string().optional(),
  // Section 6
  b_bank_name: z.string().optional(),
  b_branch: z.string().optional(),
  b_account_name: z.string().optional(),
  b_account_number: z.string().optional(),
  b_swift: z.string().optional(),
  // Section 7
  d_full_name: z.string().optional(),
  d_designation: z.string().optional(),
  d_date: z.string().optional(),
});
type FD = z.infer<typeof schema>;

function NewContractor() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FD>({
    resolver: zodResolver(schema), defaultValues: { services: [] },
  });

  const onSubmit = async (v: FD) => {
    const payload = {
      name: v.name,
      trading_name: v.trading_name || null,
      consultancy_type: v.consultancy_type,
      specialization: v.consultancy_type,
      registration_number: v.registration_number || null,
      kra_pin: v.kra_pin || null,
      vat_number: v.vat_number || null,
      nca_registration: v.nca_registration || null,
      nca_category: v.nca_category || null,
      professional_body_number: v.professional_body_number || null,
      year_established: v.year_established ?? null,
      country_of_incorporation: v.country_of_incorporation || null,
      physical_address: v.physical_address || null,
      postal_address: v.postal_address || null,
      town: v.town || null,
      phone: v.phone,
      alt_phone: v.alt_phone || null,
      email: v.email,
      website: v.website || null,
      primary_contact: {
        name: v.pc_name || null, designation: v.pc_designation || null,
        mobile: v.pc_mobile || null, email: v.pc_email || null,
      },
      services: [...(v.services ?? []), ...(v.services_other ? [v.services_other] : [])],
      recent_project: {
        name: v.rp_name || null, client: v.rp_client || null,
        value: v.rp_value || null, role: v.rp_role || null, year: v.rp_year || null,
      },
      banking: {
        bank_name: v.b_bank_name || null, branch: v.b_branch || null,
        account_name: v.b_account_name || null, account_number: v.b_account_number || null,
        swift: v.b_swift || null,
      },
      declaration: {
        full_name: v.d_full_name || null, designation: v.d_designation || null,
        date: v.d_date || null, declared_by_user_id: user?.id,
      },
      status: "active" as const,
      user_id: user?.id,
    };
    const { data, error } = await supabase.from("contractors").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await logAudit("create", "contractor", data.id, null, payload);
      toast.success("Contractor onboarded");
      nav({ to: `/contractors/${data.id}` });
    }
  };

  return (
    <>
      <PageHeader title="New contractor / consultant" description="Professional consultant registration & due diligence." />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-5">
        <Section title="Consultant information">
          <Field label="Full legal name" error={errors.name?.message}><input {...register("name")} className={fieldCls} /></Field>
          <Field label="Trading name (if applicable)"><input {...register("trading_name")} className={fieldCls} /></Field>
          <Field label="Type of consultancy" error={errors.consultancy_type?.message}><input {...register("consultancy_type")} placeholder="Architectural, QS, Engineering…" className={fieldCls} /></Field>
          <Field label="Registration number"><input {...register("registration_number")} className={fieldCls} /></Field>
          <Field label="KRA PIN"><input {...register("kra_pin")} className={fieldCls} /></Field>
          <Field label="VAT number"><input {...register("vat_number")} className={fieldCls} /></Field>
          <Field label="NCA registration no."><input {...register("nca_registration")} className={fieldCls} /></Field>
          <Field label="NCA category"><input {...register("nca_category")} placeholder="NCA 1 – NCA 8" className={fieldCls} /></Field>
          <Field label="Professional body membership no."><input {...register("professional_body_number")} className={fieldCls} /></Field>
          <Field label="Year established"><input type="number" {...register("year_established")} className={fieldCls} /></Field>
          <Field label="Country of incorporation"><input {...register("country_of_incorporation")} className={fieldCls} /></Field>
        </Section>

        <Section title="Contact details">
          <Field label="Physical address"><input {...register("physical_address")} className={fieldCls} /></Field>
          <Field label="Postal address"><input {...register("postal_address")} className={fieldCls} /></Field>
          <Field label="Town / City"><input {...register("town")} className={fieldCls} /></Field>
          <Field label="Telephone" error={errors.phone?.message}><input {...register("phone")} className={fieldCls} /></Field>
          <Field label="Alternative telephone"><input {...register("alt_phone")} className={fieldCls} /></Field>
          <Field label="Official email" error={errors.email?.message}><input type="email" {...register("email")} className={fieldCls} /></Field>
          <Field label="Website"><input {...register("website")} className={fieldCls} /></Field>
        </Section>

        <Section title="Primary contact person">
          <Field label="Full name"><input {...register("pc_name")} className={fieldCls} /></Field>
          <Field label="Designation"><input {...register("pc_designation")} className={fieldCls} /></Field>
          <Field label="Mobile"><input {...register("pc_mobile")} className={fieldCls} /></Field>
          <Field label="Email"><input type="email" {...register("pc_email")} className={fieldCls} /></Field>
        </Section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Services offered</h3>
          <p className="text-xs text-slate-500">Select all applicable services.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SERVICES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={s} {...register("services")} className="h-4 w-4 rounded border-slate-300" />
                {s}
              </label>
            ))}
          </div>
          <Field label="Others (free text)"><input {...register("services_other")} className={fieldCls} /></Field>
        </section>

        <Section title="Experience profile" description="Most recent project completed.">
          <Field label="Project name"><input {...register("rp_name")} className={fieldCls} /></Field>
          <Field label="Client"><input {...register("rp_client")} className={fieldCls} /></Field>
          <Field label="Project value"><input {...register("rp_value")} className={fieldCls} /></Field>
          <Field label="Role"><input {...register("rp_role")} className={fieldCls} /></Field>
          <Field label="Year"><input {...register("rp_year")} className={fieldCls} /></Field>
        </Section>

        <Section title="Banking details">
          <Field label="Bank name"><input {...register("b_bank_name")} className={fieldCls} /></Field>
          <Field label="Branch"><input {...register("b_branch")} className={fieldCls} /></Field>
          <Field label="Account name"><input {...register("b_account_name")} className={fieldCls} /></Field>
          <Field label="Account number"><input {...register("b_account_number")} className={fieldCls} /></Field>
          <Field label="Swift code"><input {...register("b_swift")} className={fieldCls} /></Field>
        </Section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Declaration</h3>
          <p className="text-xs text-slate-600">
            I/We certify that the information provided is true and accurate to the best of our knowledge,
            and agree to comply with Kenyan laws, professional standards, ethical conduct requirements,
            confidentiality obligations, and Kinetic policies and procedures.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name"><input {...register("d_full_name")} className={fieldCls} /></Field>
            <Field label="Designation"><input {...register("d_designation")} className={fieldCls} /></Field>
            <Field label="Date"><input type="date" {...register("d_date")} className={fieldCls} /></Field>
          </div>
        </section>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Required attachments (upload after creation): Certificate of Incorporation, CR12, KRA PIN, Tax Compliance, Professional Registration, Practicing Licenses, Insurance Certificates, Company Profile, CVs, Reference Letters, Bank Confirmation, Signed Contract / Appointment, Conflict-of-Interest Declaration.
        </div>

        <div className="flex justify-end">
          <button disabled={isSubmitting} className="h-10 px-5 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50">
            {isSubmitting ? "Saving…" : "Onboard contractor"}
          </button>
        </div>
      </form>
    </>
  );
}
