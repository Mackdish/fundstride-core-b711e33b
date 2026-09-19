import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase establishes the recovery session during auth initialization and
  // emits it through INITIAL_SESSION/PASSWORD_RECOVERY/SIGNED_IN. Do not call
  // getSession() here as a second auth operation during initialization can
  // contend with the auth client's startup coordination.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "INITIAL_SESSION" && session) ||
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN"
      ) {
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: current } = await supabase.auth.getUser();
      if (current.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ force_password_change: false })
          .eq("id", current.user.id);
        if (profileError) throw profileError;
      }

      toast.success("Password updated — please sign in");
      await supabase.auth.signOut();
      nav({ to: "/login", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#2D5F8A] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logoUrl} alt="BuildTrack360" className="h-20 w-auto object-contain" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a strong password you don't use elsewhere.</p>

        {!ready ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4">
            Waiting for the recovery link to be verified… If this doesn't clear in a few seconds,
            open the reset link from your email again.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-700">New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label className="text-sm text-slate-700">Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <button disabled={busy} className="w-full h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-60">
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500 text-center">
          <Link to="/login" className="text-[#1E3A5F] font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
