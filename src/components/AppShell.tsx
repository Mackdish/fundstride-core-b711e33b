import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth, ROLE_LABELS, AppRole } from "@/lib/auth";
import {
  LayoutDashboard, Users, Building2, FileCheck2, Banknote, Wallet, MapPin,
  HardHat, CreditCard, ShieldAlert, FileText, BarChart3, Settings, LogOut,
  Bell, Menu, X, ChevronRight, Briefcase, Target,
} from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { InstallAppButton } from "@/components/InstallAppButton";

type NavItem = { to: string; label: string; icon: any; roles?: AppRole[] };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/performance", label: "Financial Performance", icon: BarChart3, roles: ["super_admin","executive","finance_officer","risk_compliance_officer"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["super_admin","admin","executive","credit","operations","credit_officer","operations_officer"] },
  { to: "/projects", label: "Projects", icon: Building2 },
  { to: "/sales-leads", label: "Sales Leads", icon: Target, roles: ["super_admin","credit_officer","operations_officer","executive"] },
  { to: "/appraisals", label: "Appraisals", icon: FileCheck2, roles: ["super_admin","credit_officer","risk_compliance_officer"] },
  { to: "/loans", label: "Loans", icon: Banknote, roles: ["super_admin","credit_officer","finance_officer","executive"] },
  { to: "/drawdowns", label: "Drawdowns", icon: Wallet },
  { to: "/site-visits", label: "Site Visits", icon: MapPin, roles: ["super_admin","site_monitoring_officer","operations_officer"] },
  { to: "/contractors", label: "Contractors", icon: HardHat, roles: ["super_admin","operations_officer","credit_officer"] },
  { to: "/payments", label: "Payments", icon: CreditCard, roles: ["super_admin","finance_officer"] },
  { to: "/risk", label: "Risk", icon: ShieldAlert, roles: ["super_admin","risk_compliance_officer","executive"] },
  { to: "/monitoring", label: "Credit Monitoring", icon: FileCheck2, roles: ["super_admin","credit_officer","risk_compliance_officer","executive"] },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["super_admin","executive"] },
  { to: "/admin/companies", label: "Companies", icon: Briefcase, roles: ["platform_admin", "super_admin"] },
  { to: "/admin/users", label: "Users", icon: Users, roles: ["super_admin"] },
  { to: "/admin/staff", label: "Staff Members", icon: Users, roles: ["super_admin","admin"] },
  { to: "/admin/loan-products", label: "Loan Products", icon: Banknote, roles: ["super_admin","admin"] },
  { to: "/admin/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
];


export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, hasRole, signOut, tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const visible = NAV.filter((n) => !n.roles || hasRole(...n.roles));
  const primaryRole = roles[0];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#1E3A5F] text-white transform transition-transform ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-md bg-white flex items-center justify-center shrink-0 p-1">
              <img src={logoUrl} alt="BuildTrack360" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold tracking-tight leading-tight">BuildTrack360</div>
              <div className="text-[10px] text-white/60 truncate">{tenant?.name ?? "Construction Finance Management System"}</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto h-[calc(100vh-4rem)]">
          {visible.map((item) => {
            const Active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${Active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
          <button onClick={signOut} className="w-full mt-4 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/75 hover:bg-white/10">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <Breadcrumbs pathname={location.pathname} />
          </div>
          <div className="flex items-center gap-3">
            <InstallAppButton className="!h-9 !px-3 !text-xs" />
            <button className="relative p-2 rounded-md hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-medium">
                {(user?.email ?? "U").slice(0,1).toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <div className="font-medium text-slate-900 truncate max-w-[160px]">{user?.email}</div>
                <div className="text-slate-500">{primaryRole ? ROLE_LABELS[primaryRole] : "No role"}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="text-sm text-slate-500 flex items-center gap-1">
      <Link to="/dashboard" className="hover:text-slate-900">Home</Link>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="capitalize text-slate-700">{p.replace(/-/g, " ")}</span>
        </span>
      ))}
    </nav>
  );
}
