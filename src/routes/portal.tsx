import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import logoUrl from "@/assets/logo.png";
import { LogOut } from "lucide-react";
import { ProgressPhotoGallery } from "@/components/ProgressPhotoGallery";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/portal")({
  component: PortalPage,
  head: () => ({
    meta: [
      { title: "My Projects · BuildTrack360" },
      { name: "description", content: "Track your construction project progress and financing." },
    ],
  }),
});

function PortalPage() {
  const { user, loading, signOut, hasRole } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["portal", user?.id],
    queryFn: async () => {
      const { data: customers, error: customerError } = await supabase
        .from("customers").select("*").eq("owner_user_id", user!.id);
      if (customerError) throw customerError;

      const custIds = (customers ?? []).map((c: any) => c.id);
      const { data: accessRows, error: accessError } = await (supabase as any)
        .from("customer_project_access")
        .select("project_id")
        .eq("user_id", user!.id)
        .is("revoked_at", null);
      if (accessError) throw accessError;

      const assignedProjectIds = [...new Set((accessRows ?? []).map((row: any) => row.project_id))] as string[];
      const [ownedProjectsResult, assignedProjectsResult] = await Promise.all([
        custIds.length
          ? supabase.from("projects").select("*").in("customer_id", custIds)
          : Promise.resolve({ data: [] as any[] }),
        assignedProjectIds.length
          ? supabase.from("projects").select("*").in("id", assignedProjectIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if ("error" in ownedProjectsResult && ownedProjectsResult.error) throw ownedProjectsResult.error;
      if ("error" in assignedProjectsResult && assignedProjectsResult.error) throw assignedProjectsResult.error;

      const projectById = new Map<string, any>();
      for (const project of [...(ownedProjectsResult.data ?? []), ...(assignedProjectsResult.data ?? [])] as any[]) {
        projectById.set(project.id, project);
      }
      const projects = [...projectById.values()];
      const projectIds = projects.map((project: any) => project.id);

      const [customerLoansResult, projectLoansResult] = await Promise.all([
        custIds.length
          ? supabase.from("loan_facilities").select("*").in("customer_id", custIds)
          : Promise.resolve({ data: [] as any[] }),
        projectIds.length
          ? supabase.from("loan_facilities").select("*").in("project_id", projectIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if ("error" in customerLoansResult && customerLoansResult.error) throw customerLoansResult.error;
      if ("error" in projectLoansResult && projectLoansResult.error) throw projectLoansResult.error;

      const loanById = new Map<string, any>();
      for (const loan of [...(customerLoansResult.data ?? []), ...(projectLoansResult.data ?? [])] as any[]) {
        loanById.set(loan.id, loan);
      }
      const loans = [...loanById.values()];
      const loanIds = loans.map((loan: any) => loan.id);

      const [ms, dd, progressResult] = await Promise.all([
        projectIds.length
          ? supabase.from("milestones").select("*").in("project_id", projectIds)
          : Promise.resolve({ data: [] as any[] }),
        loanIds.length
          ? supabase.from("drawdown_requests").select("*").in("loan_id", loanIds)
          : Promise.resolve({ data: [] as any[] }),
        projectIds.length
          ? (supabase as any).from("project_progress_updates").select("*")
              .in("project_id", projectIds).eq("publication_status", "published")
              .order("published_at", { ascending: false })
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      if ("error" in ms && ms.error) throw ms.error;
      if ("error" in dd && dd.error) throw dd.error;
      if (progressResult.error) throw progressResult.error;
      return {
        customers: customers ?? [],
        projects,
        loans,
        milestones: ms.data ?? [],
        drawdowns: dd.data ?? [],
        progressUpdates: progressResult.data ?? [],
      };
    },
  });

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  // Staff/executives use the main dashboard.
  if (hasRole("super_admin","platform_admin","executive","admin","finance","credit","operations",
    "credit_officer","operations_officer","site_monitoring_officer","finance_officer","risk_compliance_officer")) {
    return <Navigate to="/dashboard" />;
  }

  const projects = data?.projects ?? [];
  const milestones = data?.milestones ?? [];
  const loans = data?.loans ?? [];
  const drawdowns = data?.drawdowns ?? [];
  const progressUpdates = data?.progressUpdates ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-white p-1"><img src={logoUrl} alt="" className="h-full w-full object-contain" /></div>
            <div>
              <div className="font-semibold">My Projects</div>
              <div className="text-xs text-white/70">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <button onClick={signOut} className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading your projects…</div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="font-semibold text-slate-900">No projects yet</h2>
            <p className="text-sm text-slate-500 mt-1">Your projects will appear here once your finance officer registers them.</p>
          </div>
        ) : (
          projects.map((p: any) => {
            const ms = milestones.filter((m: any) => m.project_id === p.id).sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
            const pct = ms.length
              ? Math.round(ms.reduce((s: number, m: any) => s + (Number(m.target_pct) || 0), 0) / ms.length)
              : 0;
            const projLoans = loans.filter((l: any) => l.customer_id === p.customer_id);
            const drawn = drawdowns
              .filter((d: any) => projLoans.some((l: any) => l.id === d.loan_id) && d.status === "active")
              .reduce((s: number, d: any) => s + (Number(d.requested_amount) || 0), 0);
            return (
              <section key={p.id} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{p.name}</h3>
                    <div className="text-sm text-slate-500">{p.location ?? "—"} · {p.project_type ?? "—"}</div>
                    <div className="text-xs text-slate-400 mt-1">Reference: {p.reference_number ?? "—"} · Started {formatDate(p.start_date)}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Milestone progress</span><span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#1E3A5F]" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>

                {ms.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-xs font-medium text-slate-500 mb-2">Milestones</div>
                    <ul className="space-y-1 text-sm">
                      {ms.map((m: any) => (
                        <li key={m.id} className="flex justify-between">
                          <span className="text-slate-700">{m.sequence}. {m.name}</span>
                          <span className="text-slate-500">{m.target_pct ?? 0}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {progressUpdates.filter((update: any) => update.project_id === p.id).length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="text-xs font-medium text-slate-500">Latest construction updates</div>
                    {progressUpdates
                      .filter((update: any) => update.project_id === p.id)
                      .slice(0, 3)
                      .map((update: any) => (
                        <article key={update.id} className="rounded-lg bg-slate-50 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium text-sm text-slate-900">{update.stage}</div>
                            <div className="text-xs text-slate-500">{formatDate(update.published_at)}</div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{update.status.replaceAll("_", " ")}</span>
                            <span className="font-semibold text-slate-900">{Number(update.progress_percent)}% complete</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full bg-[#1E3A5F]" style={{ width: `${Math.min(100, Math.max(0, Number(update.progress_percent)))}%` }} />
                          </div>
                          {update.observations && <p className="text-sm text-slate-700 whitespace-pre-wrap">{update.observations}</p>}
                          {update.next_steps && <p className="text-sm text-slate-600"><span className="font-medium">Next:</span> {update.next_steps}</p>}
                          <ProgressPhotoGallery
                            projectId={p.id}
                            updateId={update.id}
                            tenantId={update.tenant_id}
                          />
                        </article>
                      ))}
                  </div>
                )}

                {projLoans.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-xs font-medium text-slate-500 mb-2">Financing</div>
                    {projLoans.map((l: any) => (
                      <div key={l.id} className="text-sm flex justify-between py-1">
                        <span className="text-slate-700">Facility · {l.status}</span>
                        <span className="text-slate-500">
                          KES {(Number(l.approved_amount ?? l.requested_amount) || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="text-xs text-slate-500 mt-1">Total drawn: KES {drawn.toLocaleString()}</div>
                  </div>
                )}
              </section>
            );
          })
        )}
        <div className="text-xs text-slate-400 text-center">
          Need help? Contact your finance officer. · <Link to="/reset-password" className="underline">Change password</Link>
        </div>
      </main>
    </div>
  );
}
