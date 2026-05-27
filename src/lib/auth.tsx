import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin" | "credit_officer" | "operations_officer" | "site_monitoring_officer"
  | "finance_officer" | "risk_compliance_officer" | "developer" | "contractor" | "executive";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (...r: AppRole[]) => boolean;
  isStaff: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], loading: true,
  signOut: async () => {}, hasRole: () => false, isStaff: false,
});

const STAFF_ROLES: AppRole[] = [
  "super_admin","credit_officer","operations_officer","site_monitoring_officer",
  "finance_officer","risk_compliance_officer","executive",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r: any) => r.role as AppRole));
    setLoading(false);
  }

  const hasRole = (...r: AppRole[]) => r.some((role) => roles.includes(role));
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

  return (
    <Ctx.Provider value={{
      user, session, roles, loading,
      signOut: async () => { await supabase.auth.signOut(); },
      hasRole, isStaff,
    }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  credit_officer: "Credit Officer",
  operations_officer: "Operations",
  site_monitoring_officer: "Site Monitoring",
  finance_officer: "Finance",
  risk_compliance_officer: "Risk & Compliance",
  developer: "Developer",
  contractor: "Contractor",
  executive: "Executive",
};
