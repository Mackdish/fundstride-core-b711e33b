import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const projectSchema = z.object({
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
  customer_id: z.string().uuid("Select an onboarded customer"),
  client_contact_person: z.string().optional(),
  client_telephone: z.string().optional(),
  client_email: z.string().optional(),
  client_physical_address: z.string().optional(),
  client_postal_address: z.string().optional(),
  c_architect: z.string().optional(),
  c_quantity_surveyor: z.string().optional(),
  c_structural: z.string().optional(),
  c_civil: z.string().optional(),
  c_mechanical: z.string().optional(),
  c_electrical: z.string().optional(),
  c_project_manager: z.string().optional(),
  nature_of_development: z.string().optional(),
  floors: z.coerce.number().int().min(0).optional(),
  built_up_area: z.string().optional(),
  construction_methodology: z.string().optional(),
  key_deliverables: z.string().optional(),
  source_of_funding: z.string().optional(),
  loan_facility_amount: z.coerce.number().min(0).optional(),
  client_equity: z.coerce.number().min(0).optional(),
  expected_monthly_disbursement: z.coerce.number().min(0).optional(),
  insurance_requirements: z.string().optional(),
  a_nca: z.string().optional(),
  a_county: z.string().optional(),
  a_nema: z.string().optional(),
  a_land_ownership: z.string().optional(),
  a_safety: z.string().optional(),
  r_construction: z.string().optional(),
  r_financial: z.string().optional(),
  r_environmental: z.string().optional(),
  r_mitigation: z.string().optional(),
});
export type ProjectFD = z.infer<typeof projectSchema>;

export function mapProjectRowToForm(p: any): Partial<ProjectFD> {
  const c = p.consultants ?? {};
  const a = p.approvals ?? {};
  const r = p.risks ?? {};
  return {
    name: p.name ?? "", reference_number: p.reference_number ?? "",
    project_type: p.project_type ?? "", location: p.location ?? "", county: p.county ?? "",
    expected_value: p.expected_value ?? 0, start_date: p.start_date ?? "", end_date: p.end_date ?? "",
    units: p.units ?? undefined, gps_lat: p.gps_lat ?? undefined, gps_lng: p.gps_lng ?? undefined,
    customer_id: p.customer_id ?? "",
    client_contact_person: p.client_contact_person ?? "", client_telephone: p.client_telephone ?? "",
    client_email: p.client_email ?? "", client_physical_address: p.client_physical_address ?? "",
    client_postal_address: p.client_postal_address ?? "",
    c_architect: c.architect ?? "", c_quantity_surveyor: c.quantity_surveyor ?? "",
    c_structural: c.structural_engineer ?? "", c_civil: c.civil_engineer ?? "",
    c_mechanical: c.mechanical_engineer ?? "", c_electrical: c.electrical_engineer ?? "",
    c_project_manager: c.project_manager ?? "",
    nature_of_development: p.nature_of_development ?? "", floors: p.floors ?? undefined,
    built_up_area: p.built_up_area ?? "", construction_methodology: p.construction_methodology ?? "",
    key_deliverables: p.key_deliverables ?? "", source_of_funding: p.source_of_funding ?? "",
    loan_facility_amount: p.loan_facility_amount ?? undefined, client_equity: p.client_equity ?? undefined,
    expected_monthly_disbursement: p.expected_monthly_disbursement ?? undefined,
    insurance_requirements: p.insurance_requirements ?? "",
    a_nca: a.nca ?? "", a_county: a.county ?? "", a_nema: a.nema ?? "",
    a_land_ownership: a.land_ownership ?? "", a_safety: a.safety ?? "",
    r_construction: r.construction ?? "", r_financial: r.financial ?? "",
    r_environmental: r.environmental ?? "", r_mitigation: r.mitigation ?? "",
  };
}

export function ProjectForm({
  initial,
  projectId,
  submitLabel,
}: {
  initial?: Partial<ProjectFD>;
  projectId?: string;
  submitLabel?: string;
}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const isEdit = !!projectId;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProjectFD>({
    resolver: zodResolver(projectSchema),
    defaultValues: initial as any,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list-full"],
    queryFn: async () => (await supabase.from("customers").select("*").order("name")).data ?? [],
  });
  const { data: contractors } = useQuery({
    queryKey: ["contractors-list-full"],
    queryFn: async () => (await supabase.from("contractors").select("*").order("name")).data ?? [],
  });

  const watchedCustomerId = watch("customer_id");
  const selectedCustomer = useMemo(
    () => customers?.find((c: any) => c.id === watchedCustomerId),
    [customers, watchedCustomerId],
  );

  // Auto-populate customer details on selection (only when the field is empty,
  // so it doesn't overwrite manual edits or existing edit-mode data).
  useEffect(() => {
    if (!selectedCustomer) return;
    const s: any = selectedCustomer;
    const contact = [s.first_name, s.middle_name, s.surname].filter(Boolean).join(" ") || s.name || "";
    const address = [s.current_address, s.house_no, s.estate].filter(Boolean).join(", ") || s.address || "";
    const postal = [s.postal_address, s.postal_code].filter(Boolean).join(" ") || "";
    const setIfEmpty = (k: keyof ProjectFD, v: string) => {
      const cur = (watch(k) as any) ?? "";
      if (!cur && v) setValue(k, v as any, { shouldDirty: true });
    };
    setIfEmpty("client_contact_person", contact);
    setIfEmpty("client_telephone", s.mobile ?? s.phone ?? "");
    setIfEmpty("client_email", s.email ?? "");
    setIfEmpty("client_physical_address", address);
    setIfEmpty("client_postal_address", postal);
  }, [selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  const consultantFields: Array<[keyof ProjectFD, string]> = [
    ["c_architect", "Architect"],
    ["c_quantity_surveyor", "Quantity surveyor"],
    ["c_structural", "Structural engineer"],
    ["c_civil", "Civil engineer"],
    ["c_mechanical", "Mechanical engineer"],
    ["c_electrical", "Electrical engineer"],
    ["c_project_manager", "Project manager"],
  ];

  const onSubmit = async (v: ProjectFD) => {
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
    };

    if (isEdit) {
      const { error } = await supabase.from("projects").update(payload).eq("id", projectId!);
      if (error) { toast.error(error.message); return; }
      await logAudit("update", "project", projectId!, null, payload);
      toast.success("Project updated");
      nav({ to: "/projects/$id", params: { id: projectId! } });
    } else {
      const { data, error } = await supabase.from("projects").insert({ ...payload, status: "draft" as const, created_by: user?.id }).select().single();
      if (error) { toast.error(error.message); return; }
      if (data) {
        await logAudit("create", "project", data.id, null, payload);
        toast.success("Project created");
        nav({ to: "/projects/$id", params: { id: data.id } });
      }
    }
  };

  const selectedConsultants = consultantFields
    .map(([k, label]) => {
      const id = watch(k) as string | undefined;
      const c = contractors?.find((x: any) => x.id === id);
      return c ? { role: label, c } : null;
    })
    .filter(Boolean) as Array<{ role: string; c: any }>;

  return (
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

      <Section title="Client details" description="Selecting a customer auto-fills their contact and address details.">
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
        {selectedCustomer && (
          <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <div className="font-semibold text-slate-900 mb-1">Selected customer details</div>
            <div className="grid grid-cols-2 gap-1">
              <div><span className="text-slate-500">Name:</span> {(selectedCustomer as any).name}</div>
              <div><span className="text-slate-500">Type:</span> {(selectedCustomer as any).customer_type ?? "—"}</div>
              <div><span className="text-slate-500">ID / Reg #:</span> {(selectedCustomer as any).national_id ?? (selectedCustomer as any).registration_number ?? "—"}</div>
              <div><span className="text-slate-500">KRA PIN:</span> {(selectedCustomer as any).pin ?? "—"}</div>
              <div><span className="text-slate-500">Mobile:</span> {(selectedCustomer as any).mobile ?? (selectedCustomer as any).phone ?? "—"}</div>
              <div><span className="text-slate-500">Email:</span> {(selectedCustomer as any).email ?? "—"}</div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Project consultants" description="Consultants must already be onboarded under Contractors.">
        {consultantFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <select {...register(key)} className={fieldCls}>
              <option value="">— Select —</option>
              {contractors?.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.consultancy_type ? ` (${c.consultancy_type})` : ""}</option>)}
            </select>
          </Field>
        ))}
        {selectedConsultants.length > 0 && (
          <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-2">
            <div className="font-semibold text-slate-900">Selected consultant details</div>
            {selectedConsultants.map(({ role, c }) => (
              <div key={role} className="border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                <div className="font-medium text-slate-900">{role}: {c.name}</div>
                <div className="grid grid-cols-2 gap-1">
                  <div><span className="text-slate-500">Reg #:</span> {c.registration_number ?? "—"}</div>
                  <div><span className="text-slate-500">NCA:</span> {c.nca_registration ?? "—"} {c.nca_category ? `(${c.nca_category})` : ""}</div>
                  <div><span className="text-slate-500">Phone:</span> {c.phone ?? "—"}</div>
                  <div><span className="text-slate-500">Email:</span> {c.email ?? "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {!isEdit && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Required documents to upload after creation: Architectural Drawings, Structural Drawings, BQ, Land Ownership, NEMA, County Approval, NCA, Insurance Certificates, Contractor & Consultant Agreements, Project Programme, Financial Projections, Risk Assessment Report.
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => nav({ to: "/projects" })} className="h-10 px-4 rounded-md border border-slate-200 bg-white text-sm">Cancel</button>
        <button disabled={isSubmitting} className="h-10 px-5 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50">
          {isSubmitting ? "Saving…" : (submitLabel ?? (isEdit ? "Save changes" : "Create project"))}
        </button>
      </div>
    </form>
  );
}
