import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/new")({
  component: () => <ProtectedRoute><NewProject /></ProtectedRoute>,
});

const schema = z.object({
  customer_id: z.string().uuid("Select customer"),
  name: z.string().min(2),
  location: z.string().min(2),
  project_type: z.string().min(2),
  units: z.coerce.number().int().min(0).optional(),
  expected_value: z.coerce.number().min(0),
  gps_lat: z.coerce.number().optional(),
  gps_lng: z.coerce.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
type FD = z.infer<typeof schema>;

function NewProject() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<FD>({ resolver: zodResolver(schema) });
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });

  const onSubmit = async (v: FD) => {
    const { data, error } = await supabase.from("projects").insert({ ...v, status: "draft", created_by: user?.id }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await logAudit("create", "project", data.id, null, v);
      toast.success("Project created");
      nav({ to: `/projects/${data.id}` });
    }
  };

  const cls = "h-10 w-full px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30";
  return (
    <>
      <PageHeader title="New project" description="Register a project for credit appraisal." />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-sm">Customer</label><select {...register("customer_id")} className={cls}><option value="">— Select —</option>{customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.customer_id && <p className="text-xs text-red-600 mt-1">{errors.customer_id.message}</p>}</div>
          <div><label className="text-sm">Project name</label><input {...register("name")} className={cls} />{errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}</div>
          <div><label className="text-sm">Location</label><input {...register("location")} className={cls} /></div>
          <div><label className="text-sm">Project type</label><input {...register("project_type")} placeholder="Residential, Mixed-use…" className={cls} /></div>
          <div><label className="text-sm">Units</label><input type="number" {...register("units")} className={cls} /></div>
          <div><label className="text-sm">Expected value (KES)</label><input type="number" {...register("expected_value")} className={cls} /></div>
          <div><label className="text-sm">GPS Lat</label><input type="number" step="any" {...register("gps_lat")} className={cls} /></div>
          <div><label className="text-sm">GPS Lng</label><input type="number" step="any" {...register("gps_lng")} className={cls} /></div>
          <div><label className="text-sm">Start date</label><input type="date" {...register("start_date")} className={cls} /></div>
          <div><label className="text-sm">End date</label><input type="date" {...register("end_date")} className={cls} /></div>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Note: BOQ, drawings, and title documents must be uploaded after creation before appraisal can begin.</div>
        <button className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium">Create project</button>
      </form>
    </>
  );
}
