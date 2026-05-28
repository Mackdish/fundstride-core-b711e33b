import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/new")({
  component: () => <ProtectedRoute><NewCustomer /></ProtectedRoute>,
});

const schema = z.object({
  customer_type: z.enum(["individual", "corporate"]),

  // Customer details
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional(),
  surname: z.string().min(1, "Required"),
  national_id: z.string().min(3, "Required"),
  pin: z.string().min(3, "Required"),
  marital_status: z.string().optional(),
  postal_address: z.string().optional(),
  postal_code: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  mobile: z.string().min(7, "Required"),
  current_address: z.string().optional(),
  estate: z.string().optional(),
  house_no: z.string().optional(),
  residence_type: z.string().optional(),

  // Employment
  emp_name: z.string().optional(),
  emp_postal_address: z.string().optional(),
  emp_postal_code: z.string().optional(),
  emp_location: z.string().optional(),
  emp_email: z.string().optional(),
  emp_telephone: z.string().optional(),
  emp_department: z.string().optional(),
  emp_job_title: z.string().optional(),
  emp_length_of_service: z.string().optional(),
  emp_terms: z.string().optional(),
  emp_contract_period: z.string().optional(),

  // Business entity
  biz_name: z.string().optional(),
  biz_nature: z.string().optional(),
  biz_registration_date: z.string().optional(),
  biz_postal_address: z.string().optional(),
  biz_postal_code: z.string().optional(),
  biz_town: z.string().optional(),
  biz_email: z.string().optional(),
  biz_telephone: z.string().optional(),

  // Property
  prop_location: z.string().optional(),
  prop_title_number: z.string().optional(),
  prop_county: z.string().optional(),
  prop_land_reference: z.string().optional(),
  prop_ward: z.string().optional(),
  prop_size: z.string().optional(),
  prop_type: z.string().optional(),

  // Next of kin
  nok_first_name: z.string().optional(),
  nok_middle_name: z.string().optional(),
  nok_surname: z.string().optional(),
  nok_national_id: z.string().optional(),
  nok_occupation: z.string().optional(),
  nok_postal_address: z.string().optional(),
  nok_postal_code: z.string().optional(),
  nok_email: z.string().optional(),
  nok_telephone: z.string().optional(),
  nok_mobile: z.string().optional(),
});
type FD = z.infer<typeof schema>;

function NewCustomer() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FD>({
    resolver: zodResolver(schema),
    defaultValues: { customer_type: "individual", marital_status: "Single", residence_type: "Owner Occupied" },
  });
  const customerType = watch("customer_type");

  const onSubmit = async (v: FD) => {
    const payload = {
      name: `${v.first_name} ${v.middle_name ?? ""} ${v.surname}`.replace(/\s+/g, " ").trim(),
      customer_type: v.customer_type,
      first_name: v.first_name,
      middle_name: v.middle_name || null,
      surname: v.surname,
      national_id: v.national_id,
      pin: v.pin,
      marital_status: v.marital_status || null,
      postal_address: v.postal_address || null,
      postal_code: v.postal_code || null,
      email: v.email,
      phone: v.phone || null,
      mobile: v.mobile,
      address: v.current_address || null,
      current_address: v.current_address || null,
      estate: v.estate || null,
      house_no: v.house_no || null,
      residence_type: v.residence_type || null,
      employment: anyVal({
        name: v.emp_name, postal_address: v.emp_postal_address, postal_code: v.emp_postal_code,
        location: v.emp_location, email: v.emp_email, telephone: v.emp_telephone,
        department: v.emp_department, job_title: v.emp_job_title, length_of_service: v.emp_length_of_service,
        terms: v.emp_terms, contract_period: v.emp_contract_period,
      }),
      business_entity: anyVal({
        name: v.biz_name, nature: v.biz_nature, registration_date: v.biz_registration_date,
        postal_address: v.biz_postal_address, postal_code: v.biz_postal_code, town: v.biz_town,
        email: v.biz_email, telephone: v.biz_telephone,
      }),
      property: anyVal({
        location: v.prop_location, title_number: v.prop_title_number, county: v.prop_county,
        land_reference: v.prop_land_reference, ward: v.prop_ward, size: v.prop_size, type: v.prop_type,
      }),
      next_of_kin: anyVal({
        first_name: v.nok_first_name, middle_name: v.nok_middle_name, surname: v.nok_surname,
        national_id: v.nok_national_id, occupation: v.nok_occupation,
        postal_address: v.nok_postal_address, postal_code: v.nok_postal_code,
        email: v.nok_email, telephone: v.nok_telephone, mobile: v.nok_mobile,
      }),
      status: "pending" as const,
      created_by: user?.id,
      owner_user_id: user?.id,
      sector: v.prop_type || null,
    };
    const { data, error } = await supabase.from("customers").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await logAudit("create", "customer", data.id, null, payload);
      toast.success("Customer submitted for review");
      nav({ to: `/customers/${data.id}` });
    }
  };

  return (
    <>
      <PageHeader title="New customer" description="Capture full KYC, employment, business, property and next-of-kin information." />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-5">
        <Section title="Customer details">
          <Field label="Customer type">
            <select {...register("customer_type")} className={fieldCls}>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
            </select>
          </Field>
          <Field label="Marital status">
            <select {...register("marital_status")} className={fieldCls}>
              {["Single","Married","Widow(er)","Divorced","Other"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="First name" error={errors.first_name?.message}><input {...register("first_name")} className={fieldCls} /></Field>
          <Field label="Middle name"><input {...register("middle_name")} className={fieldCls} /></Field>
          <Field label="Surname" error={errors.surname?.message}><input {...register("surname")} className={fieldCls} /></Field>
          <Field label="National ID / Passport No." error={errors.national_id?.message}><input {...register("national_id")} className={fieldCls} /></Field>
          <Field label="KRA PIN" error={errors.pin?.message}><input {...register("pin")} className={fieldCls} /></Field>
          <Field label="Email" error={errors.email?.message}><input type="email" {...register("email")} className={fieldCls} /></Field>
          <Field label="Telephone"><input {...register("phone")} className={fieldCls} /></Field>
          <Field label="Mobile" error={errors.mobile?.message}><input {...register("mobile")} className={fieldCls} /></Field>
          <Field label="Postal address"><input {...register("postal_address")} className={fieldCls} /></Field>
          <Field label="Postal code"><input {...register("postal_code")} className={fieldCls} /></Field>
          <Field label="Current address"><input {...register("current_address")} className={fieldCls} /></Field>
          <Field label="Estate"><input {...register("estate")} className={fieldCls} /></Field>
          <Field label="House No."><input {...register("house_no")} className={fieldCls} /></Field>
          <Field label="Residence">
            <select {...register("residence_type")} className={fieldCls}>
              {["Owner Occupied","Rental","Employer Housing"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Employment details" description="Skip if not employed.">
          <Field label="Name of employer"><input {...register("emp_name")} className={fieldCls} /></Field>
          <Field label="Job title"><input {...register("emp_job_title")} className={fieldCls} /></Field>
          <Field label="Department"><input {...register("emp_department")} className={fieldCls} /></Field>
          <Field label="Length of service"><input {...register("emp_length_of_service")} className={fieldCls} /></Field>
          <Field label="Terms of employment">
            <select {...register("emp_terms")} className={fieldCls}>
              <option value="">—</option>
              {["Permanent","Probation","Contract"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Contract period (if applicable)"><input {...register("emp_contract_period")} className={fieldCls} /></Field>
          <Field label="Employer postal address"><input {...register("emp_postal_address")} className={fieldCls} /></Field>
          <Field label="Employer postal code"><input {...register("emp_postal_code")} className={fieldCls} /></Field>
          <Field label="Employer location"><input {...register("emp_location")} className={fieldCls} /></Field>
          <Field label="Employer email"><input type="email" {...register("emp_email")} className={fieldCls} /></Field>
          <Field label="Employer telephone"><input {...register("emp_telephone")} className={fieldCls} /></Field>
        </Section>

        <Section title="Business entity" description={customerType === "corporate" ? "Registered entity details." : "Skip if not applicable."}>
          <Field label="Name of registered entity"><input {...register("biz_name")} className={fieldCls} /></Field>
          <Field label="Nature of business"><input {...register("biz_nature")} className={fieldCls} /></Field>
          <Field label="Date of registration"><input type="date" {...register("biz_registration_date")} className={fieldCls} /></Field>
          <Field label="Town / City"><input {...register("biz_town")} className={fieldCls} /></Field>
          <Field label="Postal address"><input {...register("biz_postal_address")} className={fieldCls} /></Field>
          <Field label="Postal code"><input {...register("biz_postal_code")} className={fieldCls} /></Field>
          <Field label="Email"><input type="email" {...register("biz_email")} className={fieldCls} /></Field>
          <Field label="Telephone"><input {...register("biz_telephone")} className={fieldCls} /></Field>
        </Section>

        <Section title="Property details">
          <Field label="Location of property"><input {...register("prop_location")} className={fieldCls} /></Field>
          <Field label="Title number"><input {...register("prop_title_number")} className={fieldCls} /></Field>
          <Field label="County"><input {...register("prop_county")} className={fieldCls} /></Field>
          <Field label="Land reference no."><input {...register("prop_land_reference")} className={fieldCls} /></Field>
          <Field label="Ward"><input {...register("prop_ward")} className={fieldCls} /></Field>
          <Field label="Size of project"><input {...register("prop_size")} className={fieldCls} /></Field>
          <Field label="Type of property">
            <select {...register("prop_type")} className={fieldCls}>
              <option value="">—</option>
              {["Residential","Commercial","Mixed-use"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Next of kin">
          <Field label="First name"><input {...register("nok_first_name")} className={fieldCls} /></Field>
          <Field label="Middle name"><input {...register("nok_middle_name")} className={fieldCls} /></Field>
          <Field label="Surname"><input {...register("nok_surname")} className={fieldCls} /></Field>
          <Field label="National ID / Passport"><input {...register("nok_national_id")} className={fieldCls} /></Field>
          <Field label="Occupation"><input {...register("nok_occupation")} className={fieldCls} /></Field>
          <Field label="Postal address"><input {...register("nok_postal_address")} className={fieldCls} /></Field>
          <Field label="Postal code"><input {...register("nok_postal_code")} className={fieldCls} /></Field>
          <Field label="Email"><input type="email" {...register("nok_email")} className={fieldCls} /></Field>
          <Field label="Telephone"><input {...register("nok_telephone")} className={fieldCls} /></Field>
          <Field label="Mobile"><input {...register("nok_mobile")} className={fieldCls} /></Field>
        </Section>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Upload KYC documents (National ID / Passport, KRA PIN, Passport Photo, Address confirmation such as a bank statement or utility bill) after the customer record is created.
        </div>

        <div className="flex justify-end">
          <button disabled={isSubmitting} className="h-10 px-5 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50">
            {isSubmitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>
    </>
  );
}

function anyVal(obj: Record<string, any>) {
  const clean = Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "" && v !== null));
  return Object.keys(clean).length ? clean : null;
}
