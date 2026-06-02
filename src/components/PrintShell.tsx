import { ReactNode } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";

export function PrintShell({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  children,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  const { tenant } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="no-print bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link to={backTo} className="h-9 px-3 rounded-md border border-slate-200 text-sm inline-flex items-center gap-1.5 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
          )}
          <div className="text-sm text-slate-500">{title}</div>
        </div>
        <button onClick={() => window.print()} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm inline-flex items-center gap-1.5">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div className="max-w-[820px] mx-auto bg-white shadow print:shadow-none p-8 lg:p-10 my-6 print:my-0">
        <header className="flex items-start justify-between border-b border-slate-200 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="logo" className="h-12 w-12 object-contain" />
            <div>
              <div className="text-lg font-bold text-slate-900">{tenant?.name ?? "Company"}</div>
              <div className="text-xs text-slate-500">Construction Finance Management System</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-slate-900">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
            <div className="text-[10px] text-slate-400 mt-1">Generated {new Date().toLocaleString("en-GB")}</div>
          </div>
        </header>
        {children}
        <footer className="mt-10 pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
          This document is computer-generated and does not require a signature unless otherwise specified.
        </footer>
      </div>
    </div>
  );
}

export function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-900 font-medium text-right">{v ?? "—"}</span>
    </div>
  );
}
