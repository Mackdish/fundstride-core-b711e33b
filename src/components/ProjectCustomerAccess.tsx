import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";
import {
  getProjectCustomerAccess,
  grantCustomerProjectAccess,
  revokeCustomerProjectAccess,
} from "@/lib/customer-portal.functions";

export function ProjectCustomerAccess({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");

  const queryKey = ["project-customer-access", projectId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getProjectCustomerAccess({ data: { project_id: projectId } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const grantMutation = useMutation({
    mutationFn: (userId: string) => grantCustomerProjectAccess({
      data: { project_id: projectId, user_id: userId },
    }),
    onSuccess: async () => {
      toast.success("Customer access granted");
      setSelectedUserId("");
      await refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not grant access"),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeCustomerProjectAccess({
      data: { project_id: projectId, user_id: userId },
    }),
    onSuccess: async () => {
      toast.success("Project access revoked");
      await refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not revoke access"),
  });

  const candidates = (data?.candidates ?? []).filter((user: any) => !user.alreadyAssigned);
  const busy = grantMutation.isPending || revokeMutation.isPending;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Customer project access</h3>
        <p className="text-sm text-slate-500 mt-1">
          Grant access to an active customer account in this company. Access is limited to this project and can be revoked at any time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          disabled={isLoading || busy || candidates.length === 0}
          className="min-w-0 flex-1 h-10 rounded-md border border-slate-200 px-3 text-sm"
        >
          <option value="">
            {isLoading ? "Loading customer accounts…" : candidates.length ? "Select a customer account" : "No unassigned customer accounts"}
          </option>
          {candidates.map((user: any) => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.email} {user.full_name && user.email ? `— ${user.email}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => selectedUserId && grantMutation.mutate(selectedUserId)}
          disabled={!selectedUserId || busy}
          className="h-10 px-3 rounded-md bg-[#1E3A5F] text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {grantMutation.isPending ? "Granting…" : "Grant access"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">Could not load access assignments. Check your permissions and try again.</p>}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading assignments…</p>
      ) : !data?.access.length ? (
        <p className="text-sm text-slate-500">No explicit customer assignments. The linked customer account can still access its own projects.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.access.map((grant: any) => (
            <li key={grant.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {grant.profile?.full_name || grant.profile?.email || "Customer account"}
                </p>
                {grant.profile?.full_name && <p className="text-xs text-slate-500 truncate">{grant.profile.email}</p>}
              </div>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(grant.user_id)}
                disabled={busy}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
