import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent — check your email");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset link");
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
        <h1 className="text-xl font-semibold text-slate-900">Forgot your password?</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your email and we'll send you a link to reset it.</p>

        {sent ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4">
            If an account exists for <span className="font-medium">{email}</span>, a password-reset link has been sent.
            Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <button disabled={busy} className="w-full h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-60">
              {busy ? "Sending…" : "Send reset link"}
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
