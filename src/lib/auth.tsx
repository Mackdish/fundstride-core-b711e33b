import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "platform_admin"
  | "super_admin" | "admin" | "executive" | "finance" | "credit" | "operations"
  | "sales" | "projects"
  | "customer"
  // legacy aliases (kept so older data + guards keep working during transition)
  | "credit_officer" | "operations_officer" | "site_monitoring_officer"
  | "finance_officer" | "risk_compliance_officer" | "developer" | "contractor";

export type Tenant = { id: string; name: string; currency: string };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  tenant: Tenant | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (...r: AppRole[]) => boolean;
  isStaff: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], tenant: null, loading: true,
  signOut: async () => {}, hasRole: () => false, isStaff: false,
});

// Map legacy role names to the new simplified set so guards expressed in
// either vocabulary keep matching.
const ROLE_ALIASES: Record<string, AppRole[]> = {
  credit_officer: ["credit"],
  finance_officer: ["finance"],
  operations_officer: ["operations"],
  site_monitoring_officer: ["operations"],
  risk_compliance_officer: ["admin"],
  credit: ["credit_officer"],
  finance: ["finance_officer"],
  operations: ["operations_officer", "site_monitoring_officer"],
  admin: ["risk_compliance_officer"],
};

const STAFF_ROLES: AppRole[] = [
  "super_admin","admin","executive","finance","credit","operations","sales","projects",
  "credit_officer","operations_officer","site_monitoring_officer",
  "finance_officer","risk_compliance_officer",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadContext(sess.user.id), 0);
      } else {
        setRoles([]); setTenant(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadContext(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadContext(uid: string) {
    const [{ data: rs }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("tenant_id").eq("id", uid).maybeSingle(),
    ]);
    setRoles((rs ?? []).map((r: any) => r.role as AppRole));
    if (profile?.tenant_id) {
      const { data: t } = await supabase.from("tenants")
        .select("id,name,currency").eq("id", profile.tenant_id).maybeSingle();
      if (t) setTenant(t as Tenant);
    }
    setLoading(false);
  }

  const hasRole = (...r: AppRole[]) => {
    const expanded = new Set<string>(roles);
    for (const role of roles) (ROLE_ALIASES[role] ?? []).forEach((a) => expanded.add(a));
    return r.some((role) => expanded.has(role));
  };
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

  return (
    <Ctx.Provider value={{
      user, session, roles, tenant, loading,
      signOut: async () => { await supabase.auth.signOut(); },
      hasRole, isStaff,
    }}>{children}</Ctx.Provider>
  );
}


export const useAuth = () => useContext(Ctx);

// Roles surfaced in the Company-Admin user-creation UI (the 6 you specified).
export const ASSIGNABLE_ROLES: AppRole[] = [
  "super_admin","admin","executive","finance","credit","operations","sales","projects",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: "Platform Admin",
  super_admin: "Super Admin",
  admin: "Admin",
  executive: "Executive",
  finance: "Finance",
  credit: "Credit",
  operations: "Operations",
  sales: "Sales",
  projects: "Projects",
  customer: "Customer",
  // legacy
  credit_officer: "Credit (legacy)",
  operations_officer: "Operations (legacy)",
  site_monitoring_officer: "Site Monitoring (legacy)",
  finance_officer: "Finance (legacy)",
  risk_compliance_officer: "Risk & Compliance (legacy)",
  developer: "Developer",
  contractor: "Contractor",
};
