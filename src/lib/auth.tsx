import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "platform_admin" | "super_admin" | "admin" | "executive" | "finance"
  | "credit" | "operations" | "sales" | "projects" | "customer"
  | "credit_officer" | "operations_officer" | "site_monitoring_officer"
  | "finance_officer" | "risk_compliance_officer" | "developer" | "contractor";

export type Tenant = { id: string; name: string; currency: string };

interface AuthCtx {
  user: User | null; session: Session | null; roles: AppRole[]; tenant: Tenant | null;
  mustChangePassword: boolean;
  loading: boolean; signOut: () => Promise<void>; hasRole: (...r: AppRole[]) => boolean;
  isStaff: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], tenant: null, mustChangePassword: false, loading: true,
  signOut: async () => {}, hasRole: () => false, isStaff: false,
});

const ROLE_ALIASES: Record<string, AppRole[]> = {
  credit_officer: ["credit"], finance_officer: ["finance"],
  operations_officer: ["operations"], site_monitoring_officer: ["operations"],
  risk_compliance_officer: ["admin"], credit: ["credit_officer"],
  finance: ["finance_officer"], operations: ["operations_officer", "site_monitoring_officer"],
  admin: ["risk_compliance_officer"],
};

const STAFF_ROLES: AppRole[] = [
  "super_admin","admin","executive","finance","credit","operations","sales","projects",
  "credit_officer","operations_officer","site_monitoring_officer","finance_officer",
  "risk_compliance_officer",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const loadContext = async (uid: string) => {
      try {
        const [{ data: rs, error: roleError }, { data: profile, error: profileError }] =
          await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", uid),
            supabase.from("profiles").select("tenant_id,status,force_password_change").eq("id", uid).maybeSingle(),
          ]);

        if (!active) return;
        if (roleError) throw roleError;
        if (profileError) throw profileError;
        if (profile?.status !== "active") {
          await supabase.auth.signOut();
          return;
        }
        setMustChangePassword(profile?.force_password_change === true);

        setRoles((rs ?? []).map((r: { role: string }) => r.role as AppRole));

        if (profile?.tenant_id) {
          const { data: t, error } = await supabase
            .from("tenants").select("id,name,currency").eq("id", profile.tenant_id).maybeSingle();
          if (!active) return;
          if (error) throw error;
          setTenant(t ? (t as Tenant) : null);
        } else {
          setTenant(null);
        }
      } catch (error) {
        console.error("[Auth] Failed to load user context:", error);
        if (active) {
          setRoles([]);
          setTenant(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const initialize = async () => {
      try {
        // Complete Supabase initialization before registering the auth listener.
        // This avoids init-time auth races and makes the initial state deterministic.
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;

        const sess = data.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          await loadContext(sess.user.id);
        } else {
          setRoles([]);
          setTenant(null);
          setMustChangePassword(false);
          setLoading(false);
        }

        if (!active) return;

        const result = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;

          setSession(nextSession);
          setUser(nextSession?.user ?? null);

          if (!nextSession?.user) {
            setRoles([]);
            setTenant(null);
            setMustChangePassword(false);
            setLoading(false);
            return;
          }

          if (event !== "INITIAL_SESSION") {
            setLoading(true);
            // Never perform Supabase database operations inside the auth callback.
            window.setTimeout(() => {
              if (active) void loadContext(nextSession.user.id);
            }, 0);
          }
        });

        subscription = result.data.subscription;
      } catch (error) {
        console.error("[Auth] Initialization failed:", error);
        if (active) {
          setUser(null); setSession(null); setRoles([]); setTenant(null); setMustChangePassword(false); setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const hasRole = (...requiredRoles: AppRole[]) => {
    const expanded = new Set<string>(roles);
    for (const role of roles) {
      for (const alias of ROLE_ALIASES[role] ?? []) expanded.add(alias);
    }
    return requiredRoles.some((role) => expanded.has(role));
  };

  const isStaff = roles.some((role) => STAFF_ROLES.includes(role));

  return (
    <Ctx.Provider value={{
      user, session, roles, tenant, mustChangePassword, loading,
      signOut: () => supabase.auth.signOut(),
      hasRole, isStaff,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export const ASSIGNABLE_ROLES: AppRole[] = [
  "super_admin","admin","executive","finance","credit","operations","sales","projects",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: "Platform Admin", super_admin: "Super Admin", admin: "Admin",
  executive: "Executive", finance: "Finance", credit: "Credit", operations: "Operations",
  sales: "Sales", projects: "Projects", customer: "Customer",
  credit_officer: "Credit (legacy)", operations_officer: "Operations (legacy)",
  site_monitoring_officer: "Site Monitoring (legacy)", finance_officer: "Finance (legacy)",
  risk_compliance_officer: "Risk & Compliance (legacy)", developer: "Developer",
  contractor: "Contractor",
};
