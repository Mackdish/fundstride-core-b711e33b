import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: () => <ProtectedRoute roles={["super_admin"]}><Settings /></ProtectedRoute>,
});

const SECTIONS = [
  { id: "approval", label: "Approval matrix" },
  { id: "products", label: "Product limits" },
  { id: "fees", label: "Fee schedule" },
  { id: "risk", label: "Risk thresholds" },
] as const;

function Settings() {
  const [tab, setTab] = useState<typeof SECTIONS[number]["id"]>("approval");

  return (
    <>
      <PageHeader title="System settings" description="Approval workflows, product limits, fee schedules, risk thresholds." />

      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        <nav className="rounded-xl border border-slate-200 bg-white p-2 h-fit">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setTab(s.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${tab === s.id ? "bg-[#1E3A5F] text-white font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {tab === "approval" && <ApprovalMatrix />}
          {tab === "products" && <ProductLimits />}
          {tab === "fees" && <FeeSchedule />}
          {tab === "risk" && <RiskThresholds />}
        </div>
      </div>
    </>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <button onClick={onSave} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
        <Save className="h-4 w-4" /> Save changes
      </button>
    </div>
  );
}

function ApprovalMatrix() {
  const rows = [
    ["Loan facility < KES 10M", "Credit Officer", "Operations Officer"],
    ["Loan facility 10M – 50M", "Credit Officer + Risk", "Executive"],
    ["Loan facility > KES 50M", "Credit Committee", "Executive + Board"],
    ["Drawdown release", "Site Officer", "Finance Officer"],
    ["Payment release", "Finance Officer (Maker)", "Finance Officer (Checker)"],
  ];
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Approval matrix</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500 border-b border-slate-200"><tr><th className="py-2">Scope</th><th>Recommender</th><th>Final approver</th></tr></thead>
        <tbody>{rows.map(([s, r, a]) => <tr key={s} className="border-b border-slate-100 last:border-0"><td className="py-3 font-medium">{s}</td><td>{r}</td><td>{a}</td></tr>)}</tbody>
      </table>
      <SaveBar onSave={() => toast.success("Approval matrix saved")} />
    </>
  );
}

function Field({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex">
        <input defaultValue={value} className="flex-1 h-10 px-3 rounded-l-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
        {suffix && <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-200 bg-slate-50 text-sm text-slate-600">{suffix}</span>}
      </div>
    </label>
  );
}

function ProductLimits() {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Product limits</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Minimum facility" value="1000000" suffix="KES" />
        <Field label="Maximum facility" value="500000000" suffix="KES" />
        <Field label="Maximum LTV" value="70" suffix="%" />
        <Field label="Minimum DSCR" value="1.25" suffix="x" />
        <Field label="Min tenor" value="6" suffix="months" />
        <Field label="Max tenor" value="36" suffix="months" />
      </div>
      <SaveBar onSave={() => toast.success("Product limits saved")} />
    </>
  );
}

function FeeSchedule() {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Fee schedule</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Processing fee" value="2.0" suffix="%" />
        <Field label="Insurance" value="0.75" suffix="%" />
        <Field label="Legal / valuation fee" value="35000" suffix="KES" />
        <Field label="Default interest spread" value="3.0" suffix="%" />
        <Field label="Late payment penalty" value="5.0" suffix="%" />
        <Field label="Drawdown fee" value="0.5" suffix="%" />
      </div>
      <SaveBar onSave={() => toast.success("Fee schedule saved")} />
    </>
  );
}

function RiskThresholds() {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Risk thresholds</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="PAR 30 amber" value="3.0" suffix="%" />
        <Field label="PAR 30 red" value="5.0" suffix="%" />
        <Field label="Single-borrower limit" value="15.0" suffix="%" />
        <Field label="Single-sector limit" value="35.0" suffix="%" />
        <Field label="SICR threshold (DPD)" value="30" suffix="days" />
        <Field label="Stage 3 threshold (DPD)" value="90" suffix="days" />
      </div>
      <SaveBar onSave={() => toast.success("Risk thresholds saved")} />
    </>
  );
}
