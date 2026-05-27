import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Cloud, MapPin, Camera, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/site-visits/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "site_monitoring_officer", "operations_officer", "credit_officer"]}>
      <SiteVisitDetail />
    </ProtectedRoute>
  ),
});

function SiteVisitDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["site-visit", id],
    queryFn: async () => {
      const [v, iss, media] = await Promise.all([
        supabase.from("site_visits").select("*, project:projects(name,location)").eq("id", id).single(),
        supabase.from("issues").select("*").eq("site_visit_id", id),
        supabase.from("site_media").select("*").eq("site_visit_id", id),
      ]);
      return { v: v.data as any, iss: iss.data ?? [], media: media.data ?? [] };
    },
  });

  if (isLoading || !data?.v) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;
  const v = data.v;

  return (
    <>
      <PageHeader
        title={`Site visit · ${v.project?.name ?? "—"}`}
        description={`${v.project?.location ?? "—"} · ${formatDate(v.visit_date)}`}
        actions={<StatusBadge status={v.status} />}
      />

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card icon={<Cloud className="h-4 w-4" />} label="Weather" value={v.weather ?? "—"} />
        <Card icon={<MapPin className="h-4 w-4" />} label="GPS" value={v.gps_lat && v.gps_lng ? `${Number(v.gps_lat).toFixed(4)}, ${Number(v.gps_lng).toFixed(4)}` : "—"} />
        <Card icon={<Camera className="h-4 w-4" />} label="Media" value={`${data.media.length} files`} />
        <Card icon={<AlertTriangle className="h-4 w-4" />} label="Issues" value={`${data.iss.length} open`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-2">Observations</h3>
          <p className="text-sm text-slate-700 whitespace-pre-line">{v.observations ?? "No narrative recorded."}</p>

          <h3 className="font-semibold text-slate-900 mt-6 mb-3">Photos & geotags</h3>
          {data.media.length === 0 ? <div className="text-sm text-slate-500">No media uploaded.</div> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(data.media as any[]).map((m) => (
                <div key={m.id} className="aspect-video rounded-lg bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
                  <Camera className="h-6 w-6 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Issues raised</h3>
          {data.iss.length === 0 ? <div className="text-sm text-slate-500">No issues raised at this visit.</div> : (
            <ul className="space-y-3">
              {(data.iss as any[]).map((i) => (
                <li key={i.id} className="border-b border-slate-100 last:border-0 pb-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium">{i.description}</span>
                    <StatusBadge status={i.severity} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{i.category ?? "—"} · {i.responsible_party ?? "—"} · due {formatDate(i.due_date)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
function Card({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide">{icon}{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
