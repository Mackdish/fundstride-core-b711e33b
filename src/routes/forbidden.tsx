import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/forbidden")({ component: Forbidden });

function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">403 · Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">Your role does not have permission to view this page. Contact your system administrator if you believe this is in error.</p>
        <Link to="/dashboard" className="mt-6 inline-flex h-10 px-4 items-center rounded-md bg-[#1E3A5F] text-white text-sm font-medium">Back to dashboard</Link>
      </div>
    </div>
  );
}
