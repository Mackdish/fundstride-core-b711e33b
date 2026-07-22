import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EditDeleteBar } from "@/components/EditDeleteBar";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { CustomerLoginButton } from "@/components/CustomerLoginButton";
import { useAuth } from "@/lib/auth";


export const Route = createFileRoute("/customers/$id")({
  component: () => <ProtectedRoute><CustomerDetail /></ProtectedRoute>,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const [c, dirs, docs] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).single(),
        supabase.from("customer_directors").select("*").eq("customer_id", id),
        supabase.from("customer_documents").select("*").eq("customer_id", id),
      ]);
      return { customer: c.data, directors: dirs.data ?? [], docs: docs.data ?? [] };
    },
  });

  if (isLoading || !data?.customer) return <div className="text-sm text-slate-500">Loading…</div>;
  const c: any = data.customer;
  const canManage = useAuth().hasRole(
    "super_admin","platform_admin","admin","executive","credit","operations",
    "credit_officer","operations_officer",
  );
  return (
    <>
      <PageHeader title={c.name} description={`${c.customer_type} · ${c.sector ?? "—"}`} actions={
        <div className="flex items-center gap-3">
          <Link to="/customers/$id/statement" params={{ id: c.id }} className="h-9 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Statement</Link>
          <StatusBadge status={c.status} />
          {canManage && <CustomerLoginButton customer={c} />}
          <EditDeleteBar
            table="customers" id={c.id} row={c} queryKey={["customer", id]}
            redirectAfterDelete="/customers"
            fields={[
              { key: "name", label: "Legal name" },
              { key: "customer_type", label: "Type", type: "select", options: ["corporate", "individual"] },
              { key: "status", label: "Status", type: "select", options: ["draft","pending","active","rejected","completed"] },
              { key: "pin", label: "KRA PIN" },
              { key: "registration_number", label: "Registration number" },
              { key: "email", label: "Email", type: "email" },
              { key: "phone", label: "Phone" },
              { key: "sector", label: "Sector" },
              { key: "address", label: "Address", type: "textarea" },
            ]}
          />
        </div>
      } />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Company info</h3>
          <Row k="PIN" v={c.pin} /><Row k="Reg. No." v={c.registration_number} />
          <Row k="Email" v={c.email} /><Row k="Phone" v={c.phone} />
          <Row k="Address" v={c.address} /><Row k="Created" v={formatDate(c.created_at)} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Directors ({data.directors.length})</h3>
          {data.directors.length === 0 ? <div className="text-sm text-slate-500">No directors recorded.</div> :
            data.directors.map((d: any) => (
              <div key={d.id} className="py-2 border-b border-slate-100 last:border-0 flex justify-between text-sm">
                <span>{d.name}</span><span className="text-slate-500">{d.shareholding_pct}%</span>
              </div>
            ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Documents ({data.docs.length})</h3>
          {data.docs.length === 0 ? <div className="text-sm text-slate-500">No documents uploaded.</div> :
            data.docs.map((d: any) => (
              <div key={d.id} className="py-2 border-b border-slate-100 last:border-0 text-sm flex justify-between">
                <span>{d.doc_type} <span className="text-xs text-slate-400">v{d.version}</span></span>
                <StatusBadge status={d.status} />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
function Row({ k, v }: any) { return <div className="text-sm flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-900">{v ?? "—"}</span></div>; }
