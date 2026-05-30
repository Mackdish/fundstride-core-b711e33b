import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/dashboard" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        if (!companyName.trim()) throw new Error("Company name is required");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, company_name: companyName.trim() },
          },
        });
        if (error) throw error;
        toast.success(`Company "${companyName}" created. You're its super admin.`);
      }
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally { setBusy(false); }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#2D5F8A] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-md bg-amber-500 flex items-center justify-center text-white font-bold">B</div>
          <div>
            <div className="font-semibold text-slate-900">BuildTrack360</div>
            <div className="text-xs text-slate-500">Kinetic Investment Ventures · CFMS</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{mode === "signin" ? "Sign in" : "Create your company"}</h1>
        <p className="text-sm text-slate-500 mb-6">{mode === "signin" ? "Access your portal." : "You'll become the super admin of a new workspace."}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-sm text-slate-700">Company name</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Acme Construction Finance" className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
              <div>
                <label className="text-sm text-slate-700">Your full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-slate-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <div>
            <label className="text-sm text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <button disabled={busy} className="w-full h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-60">
            {busy ? "Please wait…" : (mode === "signin" ? "Sign in" : "Create account")}
          </button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 text-sm text-[#1E3A5F] hover:underline">
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
