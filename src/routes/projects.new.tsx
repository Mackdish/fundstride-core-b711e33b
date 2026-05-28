import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/new")({
  component: () => <ProtectedRoute><NewProject /></ProtectedRoute>,
});

const schema = z.object({
  // Section 1 - project info
  name: z.string().min(2, "Required"),
  reference_number: z.string().optional(),
  project_type: z.string().min(2, "Required"),
  location: z.string().min(2, "Required"),
  county: z.string().optional(),
  expected_value: z.coerce.number().min(0),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  units: z.coerce.number().int().min(0).optional(),
  gps_lat: z.coerce.number().optional(),
  gps_lng: z.coerce.number().optional(),
  // Section 2 - client
  customer_id: z.string().uuid("Select an onboarded customer"),
  client_contact_person: z.string().optional(),
  client_telephone: z.string().optional(),
  client_email: z.string().optional(),
  client_physical_address: z.string().optional(),
  client_postal_address: z.string().optional(),
  // Section 3 - consultants
  c_architect: z.string().optional(),
  c_quantity_surveyor: z.string().optional(),
  c_structural: z.string().optional(),
  c_civil: z.string().optional(),
  c_mechanical: z.string().optional(),
  c_electrical: z.string().optional(),
  c_project_manager: z.string().optional(),
  // Section 4 - scope
  nature_of_development: z.string().optional(),
  floors: z.coerce.number().int().min(0).optional(),
  built_up_area: z.string().optional(),
  construction_methodology: z.string().optional(),
  key_deliverables: z.string().optional(),
  // Section 5 - financial
  source_of_funding: z.string().optional(),
  loan_facility_amount: z.coerce.number().min(0).optional(),
  client_equity: z.coerce.number().min(0).optional(),
  expected_monthly_disbursement: z.coerce.number().min(0).optional(),
  insurance_requirements: z.string().optional(),
  // Section 6 - regulatory
  a_nca: z.string().optional(),
  a_county: z.string().optional(),
  a_nema: z.string().optional(),
  a_land_ownership: z.string().optional(),
  a_safety: z.string().optional(),
  // Section 7 - risks
  r_construction: z.string().optional(),
  r_financial: z.string().optional(),
  r_environmental: z.string().optional(),
  r_mitigation: z.string().optional(),
});
type FD = z.infer<typeof schema>;

function NewProject() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FD>({ resolver: zodResolver(schema) });
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });

  const onSubmit = async (v: FD) => {
    const payload = {
      customer_id: v.customer_id,
      name: v.name,
      reference_number: v.reference_number || null,
      project_type: v.project_type,
      location: v.location,
      county: v.county || null,
      units: v.units ?? null,
      expected_value: v.expected_value,
      gps_lat: v.gps_lat ?? null,
      gps_lng: v.gps_lng ?? null,
      start_date: v.start_date || null,
      end_date: v.end_date || null,
      client_contact_person: v.client_contact_person || null,
      client_telephone: v.client_telephone || null,
      client_email: v.client_email || null,
      client_physical_address: v.client_physical_address || null,
      client_postal_address: v.client_postal_address || null,
      consultants: {
        architect: v.c_architect || null, quantity_surveyor: v.c_quantity_surveyor || null,
        structural_engineer: v.c_structural || null, civil_engineer: v.c_civil || null,
        mechanical_engineer: v.c_mechanical || null, electrical_engineer: v.c_electrical || null,
        project_manager: v.c_project_manager || null,
      },
      nature_of_development: v.nature_of_development || null,
      floors: v.floors ?? null,
      built_up_area: v.built_up_area || null,
      construction_methodology: v.construction_methodology || null,
      key_deliverables: v.key_deliverables || null,
      source_of_funding: v.source_of_funding || null,
      loan_facility_amount: v.loan_facility_amount ?? null,
      client_equity: v.client_equity ?? null,
      expected_monthly_disbursement: v.expected_monthly_disbursement ?? null,
      insurance_requirements: v.insurance_requirements || null,
      approvals: {
        nca: v.a_nca || null, county: v.a_county || null, nema: v.a_nema || null,
        land_ownership: v.a_land_ownership || null, safety: v.a_safety || null,
      },
      risks: {
        construction: v.r_construction || null, financial: v.r_financial || null,
        environmental: v.r_environmental || null, mitigation: v.r_mitigation || null,
      },
      status: "draft" as const,
      created_by: user?.id,
    };
    const { data, error } = await supabase.from("projects").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await logAudit("create", "project", data.id, null, payload);
      toast.success("Project created");
      nav({ to: `/projects/${data.id}` });
    }
  };

  return (
    <>
      <PageHeader title="New project" description="Register a project for credit appraisal — full onboarding form." />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-5">
        <Section title="Project information">
          <Field label="Project name" error={errors.name?.message}><input {...register("name")} className={fieldCls} /></Field>
          <Field label="Project reference number"><input {...register("reference_number")} className={fieldCls} /></Field>
          <Field label="Project type" error={errors.project_type?.message}><input {...register("project_type")} placeholder="Residential, Mixed-use…" className={fieldCls} /></Field>
          <Field label="Project location" error={errors.location?.message}><input {...register("location")} className={fieldCls} /></Field>
          <Field label="County"><input {...register("county")} className={fieldCls} /></Field>
          <Field label="Estimated project value (KES)" error={errors.expected_value?.message}><input type="number" step="0.01" {...register("expected_value")} className={fieldCls} /></Field>
          <Field label="Expected start date"><input type="date" {...register("start_date")} className={fieldCls} /></Field>
          <Field label="Expected completion date"><input type="date" {...register("end_date")} className={fieldCls} /></Field>
          <Field label="Units"><input type="number" {...register("units")} className={fieldCls} /></Field>
          <Field label="GPS Lat"><input type="number" step="any" {...register("gps_lat")} className={fieldCls} /></Field>
          <Field label="GPS Lng"><input type="number" step="any" {...register("gps_lng")} className={fieldCls} /></Field>
        </Section>

        <Section title="Client details" description="Customer must already be onboarded.">
          <Field label="Customer" error={errors.customer_id?.message}>
            <select {...register("customer_id")} className={fieldCls}>
              <option value="">— Select —</option>
              {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Client contact person"><input {...register("client_contact_person")} className={fieldCls} /></Field>
          <Field label="Telephone"><input {...register("client_telephone")} className={fieldCls} /></Field>
          <Field label="Email"><input type="email" {...register("client_email")} className={fieldCls} /></Field>
          <Field label="Physical address"><input {...register("client_physical_address")} className={fieldCls} /></Field>
          <Field label="Postal address"><input {...register("client_postal_address")} className={fieldCls} /></Field>
        </Section>

        <Section title="Project consultants" description="Consultants must already be onboarded under Contractors.">
          <Field label="Architect"><input {...register("c_architect")} className={fieldCls} /></Field>
          <Field label="Quantity surveyor"><input {...register("c_quantity_surveyor")} className={fieldCls} /></Field>
          <Field label="Structural engineer"><input {...register("c_structural")} className={fieldCls} /></Field>
          <Field label="Civil engineer"><input {...register("c_civil")} className={fieldCls} /></Field>
          <Field label="Mechanical engineer"><input {...register("c_mechanical")} className={fieldCls} /></Field>
          <Field label="Electrical engineer"><input {...register("c_electrical")} className={fieldCls} /></Field>
          <Field label="Project manager"><input {...register("c_project_manager")} className={fieldCls} /></Field>
        </Section>

        <Section title="Project scope">
          <Field label="Nature of development"><input {...register("nature_of_development")} className={fieldCls} /></Field>
          <Field label="Number of floors"><input type="number" {...register("floors")} className={fieldCls} /></Field>
          <Field label="Approximate built-up area"><input {...register("built_up_area")} placeholder="e.g. 2,400 m²" className={fieldCls} /></Field>
          <Field label="Construction methodology" className="sm:col-span-2"><textarea {...register("construction_methodology")} className={`${fieldCls} h-20 py-2`} /></Field>
          <Field label="Key deliverables" className="sm:col-span-2"><textarea {...register("key_deliverables")} className={`${fieldCls} h-20 py-2`} /></Field>
        </Section>

        <Section title="Financial information">
          <Field label="Source of funding"><input {...register("source_of_funding")} className={fieldCls} /></Field>
          <Field label="Loan facility amount (KES)"><input type="number" step="0.01" {...register("loan_facility_amount")} className={fieldCls} /></Field>
          <Field label="Client equity contribution (KES)"><input type="number" step="0.01" {...register("client_equity")} className={fieldCls} /></Field>
          <Field label="Expected monthly disbursement (KES)"><input type="number" step="0.01" {...register("expected_monthly_disbursement")} className={fieldCls} /></Field>
          <Field label="Insurance requirements" className="sm:col-span-2"><textarea {...register("insurance_requirements")} className={`${fieldCls} h-20 py-2`} /></Field>
        </Section>

        <Section title="Regulatory compliance" description="Reference numbers and approval dates.">
          <Field label="NCA approval"><input {...register("a_nca")} className={fieldCls} /></Field>
          <Field label="County approval"><input {...register("a_county")} className={fieldCls} /></Field>
          <Field label="NEMA approval"><input {...register("a_nema")} className={fieldCls} /></Field>
          <Field label="Land ownership documents"><input {...register("a_land_ownership")} className={fieldCls} /></Field>
          <Field label="Occupational safety requirements"><input {...register("a_safety")} className={fieldCls} /></Field>
        </Section>

        <Section title="Risk assessment">
          <Field label="Construction risks identified" className="sm:col-span-2"><textarea {...register("r_construction")} className={`${fieldCls} h-20 py-2`} /></Field>
          <Field label="Financial risks identified" className="sm:col-span-2"><textarea {...register("r_financial")} className={`${fieldCls} h-20 py-2`} /></Field>
          <Field label="Environmental risks identified" className="sm:col-span-2"><textarea {...register("r_environmental")} className={`${fieldCls} h-20 py-2`} /></Field>
          <Field label="Mitigation measures" className="sm:col-span-2"><textarea {...register("r_mitigation")} className={`${fieldCls} h-20 py-2`} /></Field>
        </Section>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Required documents to upload after creation: Architectural Drawings, Structural Drawings, BQ, Land Ownership, NEMA, County Approval, NCA, Insurance Certificates, Contractor & Consultant Agreements, Project Programme, Financial Projections, Risk Assessment Report.
        </div>

        <div className="flex justify-end">
          <button disabled={isSubmitting} className="h-10 px-5 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50">
            {isSubmitting ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </>
  );
}
