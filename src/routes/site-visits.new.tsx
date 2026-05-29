import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/site-visits/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "site_monitoring_officer", "operations_officer", "credit_officer"]}>
      <NewSiteVisit />
    </ProtectedRoute>
  ),
});

const PURPOSES = [
  "Initial Assessment", "Progress Verification", "Drawdown Approval",
  "Quality Inspection", "Recovery/Risk Review", "Final Completion Inspection",
];
const RISK_LEVELS = ["Low", "Medium", "High"];
const QUALITY_ITEMS = ["Foundation Works Acceptable", "Structural Works Acceptable", "Roofing Acceptable", "Finishes Acceptable", "Materials Meet Specifications"];
const HSE_ITEMS = ["PPE Compliance", "Site Signage Available", "First Aid Facilities Available", "Environmental Controls Adequate"];
const WEATHER = ["Clear", "Sunny", "Cloudy", "Light Rain", "Heavy Rain", "Windy"];

function NewSiteVisit() {
  const { user } = useAuth();
  const nav = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["sv-projects"],
    queryFn: async () => (await supabase.from("projects").select("id,name,location,customer_id").order("name")).data ?? [],
  });
  const { data: loans } = useQuery({
    queryKey: ["sv-loans"],
    queryFn: async () => (await supabase.from("loan_facilities").select("id,project_id,approved_amount,account_number").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: drawdowns } = useQuery({
    queryKey: ["sv-dd"],
    queryFn: async () => (await supabase.from("drawdown_requests").select("id,loan_id,requested_amount,status").order("created_at", { ascending: false })).data ?? [],
  });

  const [f, setF] = useState<any>({
    project_id: "", loan_id: "", drawdown_request_id: "",
    visit_date: new Date().toISOString().slice(0, 10),
    purpose: "Progress Verification", weather: "Clear",
    gps_lat: "", gps_lng: "",
    engineer_qs: "",
    planned_progress_pct: "", actual_progress_pct: "",
    works_completed: "", works_ongoing: "", works_pending: "",
    qs_estimated: "", qs_certified: "", qs_recommended: "", qs_comments: "",
    quality: Object.fromEntries(QUALITY_ITEMS.map((k) => [k, false])),
    quality_obs: "",
    hse: Object.fromEntries(HSE_ITEMS.map((k) => [k, false])),
    hse_incidents: "",
    delay_risk: "Low", cost_overrun_risk: "Low", contractor_risk: "Low", cashflow_risk: "Low", overall_risk: "Low",
    score_quality: 16, score_timeliness: 16, score_resources: 16, score_safety: 16, score_comms: 16,
    drawdown_recommendation: "Approve Full Drawdown",
    recommendation_details: "",
    observations: "",
    status: "draft",
  });

  // Auto-link loan→project & filter drawdowns
  useEffect(() => {
    if (f.loan_id) {
      const ln = loans?.find((l: any) => l.id === f.loan_id);
      if (ln && !f.project_id) setF((s: any) => ({ ...s, project_id: ln.project_id }));
    }
  }, [f.loan_id, loans]);

  const filteredLoans = (loans ?? []).filter((l: any) => !f.project_id || l.project_id === f.project_id);
  const filteredDD = (drawdowns ?? []).filter((d: any) => !f.loan_id || d.loan_id === f.loan_id);

  const variance = useMemo(() => {
    if (f.planned_progress_pct && f.actual_progress_pct) return Number(f.actual_progress_pct) - Number(f.planned_progress_pct);
    return null;
  }, [f.planned_progress_pct, f.actual_progress_pct]);

  const contractorTotal = Number(f.score_quality) + Number(f.score_timeliness) + Number(f.score_resources) + Number(f.score_safety) + Number(f.score_comms);

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
  const toggle = (group: "quality" | "hse", k: string) => () => setF((p: any) => ({ ...p, [group]: { ...p[group], [k]: !p[group][k] } }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.project_id) return toast.error("Project is required");
    try {
      const { data: sv, error } = await supabase.from("site_visits").insert({
        project_id: f.project_id, loan_id: f.loan_id || null, drawdown_request_id: f.drawdown_request_id || null,
        visit_date: f.visit_date, purpose: f.purpose, weather: f.weather,
        gps_lat: f.gps_lat ? Number(f.gps_lat) : null, gps_lng: f.gps_lng ? Number(f.gps_lng) : null,
        engineer_qs: f.engineer_qs, officer_id: user?.id,
        planned_progress_pct: f.planned_progress_pct ? Number(f.planned_progress_pct) : null,
        actual_progress_pct: f.actual_progress_pct ? Number(f.actual_progress_pct) : null,
        works_completed: f.works_completed, works_ongoing: f.works_ongoing, works_pending: f.works_pending,
        qs_assessment: { estimated: f.qs_estimated, certified: f.qs_certified, recommended: f.qs_recommended, comments: f.qs_comments },
        quality_checklist: { ...f.quality, observations: f.quality_obs },
        hse_compliance: { ...f.hse, incidents: f.hse_incidents },
        risk_matrix: { delay: f.delay_risk, cost_overrun: f.cost_overrun_risk, contractor: f.contractor_risk, cashflow: f.cashflow_risk, overall: f.overall_risk },
        contractor_scorecard: { quality: f.score_quality, timeliness: f.score_timeliness, resources: f.score_resources, safety: f.score_safety, communication: f.score_comms, total: contractorTotal },
        drawdown_recommendation: f.drawdown_recommendation,
        recommendation_details: f.recommendation_details,
        observations: f.observations,
        status: f.status,
      }).select("id").single();
      if (error) throw error;
      await logAudit("create", "site_visit", sv!.id);
      toast.success("Site visit report created");
      nav({ to: "/site-visits/$id", params: { id: sv!.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New site visit report" description="Construction project monitoring, QS assessment & drawdown recommendation." />

      <Section title="A. Project & Facility Information">
        <Field label="Project *">
          <select className={fieldCls} value={f.project_id} onChange={set("project_id")}>
            <option value="">Select project…</option>
            {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.location ? `· ${p.location}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Loan Facility">
          <select className={fieldCls} value={f.loan_id} onChange={set("loan_id")}>
            <option value="">— None —</option>
            {filteredLoans.map((l: any) => <option key={l.id} value={l.id}>{l.account_number ?? l.id.slice(0,8)} · KES {Number(l.approved_amount).toLocaleString()}</option>)}
          </select>
        </Field>
        <Field label="Current Drawdown Request">
          <select className={fieldCls} value={f.drawdown_request_id} onChange={set("drawdown_request_id")}>
            <option value="">— None —</option>
            {filteredDD.map((d: any) => <option key={d.id} value={d.id}>{d.id.slice(0,8)} · KES {Number(d.requested_amount).toLocaleString()} · {d.status}</option>)}
          </select>
        </Field>
        <Field label="Site Visit Date"><input type="date" className={fieldCls} value={f.visit_date} onChange={set("visit_date")} /></Field>
        <Field label="Engineer / QS"><input className={fieldCls} value={f.engineer_qs} onChange={set("engineer_qs")} /></Field>
        <Field label="Weather">
          <select className={fieldCls} value={f.weather} onChange={set("weather")}>{WEATHER.map((w) => <option key={w}>{w}</option>)}</select>
        </Field>
      </Section>

      <Section title="B. Purpose of Visit">
        <Field label="Purpose" className="sm:col-span-2">
          <select className={fieldCls} value={f.purpose} onChange={set("purpose")}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
      </Section>

      <Section title="C. Construction Progress Assessment" description={variance != null ? `Variance: ${variance.toFixed(1)}% (${variance >= 0 ? "ahead" : "behind"} schedule)` : "Variance auto-calculates."}>
        <Field label="Planned Progress (%)"><input type="number" min={0} max={100} className={fieldCls} value={f.planned_progress_pct} onChange={set("planned_progress_pct")} /></Field>
        <Field label="Actual Progress (%)"><input type="number" min={0} max={100} className={fieldCls} value={f.actual_progress_pct} onChange={set("actual_progress_pct")} /></Field>
        <Field label="Works Completed" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.works_completed} onChange={set("works_completed")} /></Field>
        <Field label="Works Ongoing" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.works_ongoing} onChange={set("works_ongoing")} /></Field>
        <Field label="Works Pending" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.works_pending} onChange={set("works_pending")} /></Field>
      </Section>

      <Section title="D. Quantity Surveyor / Engineer Assessment">
        <Field label="Estimated Value of Works Completed (KES)"><input type="number" className={fieldCls} value={f.qs_estimated} onChange={set("qs_estimated")} /></Field>
        <Field label="Certified Value of Works (KES)"><input type="number" className={fieldCls} value={f.qs_certified} onChange={set("qs_certified")} /></Field>
        <Field label="Recommended Drawdown Amount (KES)"><input type="number" className={fieldCls} value={f.qs_recommended} onChange={set("qs_recommended")} /></Field>
        <Field label="QS Comments" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.qs_comments} onChange={set("qs_comments")} /></Field>
      </Section>

      <Section title="E. Quality Assessment Checklist">
        <div className="sm:col-span-2 space-y-2">
          {QUALITY_ITEMS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.quality[k]} onChange={toggle("quality", k)} /> {k}
            </label>
          ))}
        </div>
        <Field label="Observations" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.quality_obs} onChange={set("quality_obs")} /></Field>
      </Section>

      <Section title="F. Health, Safety & Environmental Compliance">
        <div className="sm:col-span-2 space-y-2">
          {HSE_ITEMS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.hse[k]} onChange={toggle("hse", k)} /> {k}
            </label>
          ))}
        </div>
        <Field label="Incidents / Concerns" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.hse_incidents} onChange={set("hse_incidents")} /></Field>
      </Section>

      <Section title="G. Risk Assessment Matrix">
        {(["delay_risk","cost_overrun_risk","contractor_risk","cashflow_risk","overall_risk"] as const).map((k) => (
          <Field key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}>
            <select className={fieldCls} value={f[k]} onChange={set(k)}>{RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}</select>
          </Field>
        ))}
      </Section>

      <Section title="H. Contractor Performance Scorecard (each /20)" description={`Total: ${contractorTotal} / 100`}>
        {(["score_quality","score_timeliness","score_resources","score_safety","score_comms"] as const).map((k) => (
          <Field key={k} label={k.replace("score_", "").replace(/\b\w/g, (l) => l.toUpperCase())}>
            <input type="number" min={0} max={20} className={fieldCls} value={f[k]} onChange={set(k)} />
          </Field>
        ))}
      </Section>

      <Section title="I. Site Photographs & Geo-location">
        <Field label="GPS Latitude"><input type="number" step="0.000001" className={fieldCls} value={f.gps_lat} onChange={set("gps_lat")} /></Field>
        <Field label="GPS Longitude"><input type="number" step="0.000001" className={fieldCls} value={f.gps_lng} onChange={set("gps_lng")} /></Field>
        <div className="sm:col-span-2 text-xs text-slate-500">Photos can be attached after creating the visit from the detail page.</div>
      </Section>

      <Section title="J. Drawdown Recommendation">
        <Field label="Recommendation">
          <select className={fieldCls} value={f.drawdown_recommendation} onChange={set("drawdown_recommendation")}>
            <option>Approve Full Drawdown</option>
            <option>Approve Partial Drawdown</option>
            <option>Defer Drawdown Pending Corrective Actions</option>
          </select>
        </Field>
        <Field label="Recommendation Details" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.recommendation_details} onChange={set("recommendation_details")} /></Field>
        <Field label="Overall Observations" className="sm:col-span-2"><textarea className={fieldCls + " h-24 py-2"} value={f.observations} onChange={set("observations")} /></Field>
        <Field label="Status">
          <select className={fieldCls} value={f.status} onChange={set("status")}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => nav({ to: "/site-visits" })} className="px-4 h-10 rounded-md border border-slate-200 text-sm bg-white">Cancel</button>
        <button type="submit" className="px-5 h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium">Create site visit</button>
      </div>
    </form>
  );
}
