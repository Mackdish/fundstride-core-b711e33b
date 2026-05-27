import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ icon, title, message, cta }: { icon?: ReactNode; title: string; message?: string; cta?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{message}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
