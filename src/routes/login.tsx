import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.png";
import { InstallAppButton } from "@/components/InstallAppButton";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/dashboard" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#2D5F8A] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logoUrl} alt="BuildTrack360" className="h-20 w-auto object-contain" />
          <div className="text-xs text-slate-500 mt-2">Construction Finance Management System</div>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Access your company portal.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#1E3A5F] hover:underline font-medium">Forgot password?</Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <button disabled={busy} className="w-full h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-60">
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-xs text-slate-500 text-center">
          New company? Contact your Platform Administrator to be onboarded.
        </p>
      </div>
    </div>
  );
}
