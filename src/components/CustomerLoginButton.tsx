import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { createCustomerLogin } from "@/lib/customer-login.functions";

export function CustomerLoginButton({ customer }: { customer: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(customer.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const hasLogin = !!customer.owner_user_id;

  async function submit() {
    if (!email || password.length < 8) { toast.error("Email and 8+ char password required"); return; }
    setBusy(true);
    try {
      await createCustomerLogin({ data: {
        customer_id: customer.id, email, password, full_name: customer.name,
      }});
      toast.success(hasLogin ? "Password reset for customer" : "Login created — share credentials with the customer");
      setPassword("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["customer", customer.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create login");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50 flex items-center gap-1.5"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {hasLogin ? "Reset customer login" : "Create customer login"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-slate-900">{hasLogin ? "Reset customer login" : "Create customer login"}</h3>
              <p className="text-xs text-slate-500 mt-1">The customer will use these credentials to sign in and track their projects.</p>
            </div>
            <div>
              <label className="text-sm text-slate-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200" />
            </div>
            <div>
              <label className="text-sm text-slate-700">Password (min 8 characters)</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-9 px-3 rounded-md border border-slate-200 text-sm">Cancel</button>
              <button onClick={submit} disabled={busy}
                className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium disabled:opacity-50">
                {busy ? "Saving…" : hasLogin ? "Reset password" : "Create login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
