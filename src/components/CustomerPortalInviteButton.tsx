import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MailPlus } from "lucide-react";
import { inviteCustomerPortalAccess } from "@/lib/customer-portal.functions";

export function CustomerPortalInviteButton({ customer }: { customer: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(customer.email ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim()) {
      toast.error("Enter the customer's email address.");
      return;
    }
    setBusy(true);
    try {
      const result = await inviteCustomerPortalAccess({
        data: { customer_id: customer.id, email: email.trim() },
      });
      if (result.mode === "already_linked") {
        toast.info("This customer already has portal access.");
      } else if (result.mode === "linked_existing") {
        toast.success("Existing customer account linked to this customer.");
      } else {
        toast.success("Invitation email sent. The customer can accept it to access the portal.");
      }
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to invite customer");
    } finally {
      setBusy(false);
    }
  }

  if (customer.owner_user_id) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50 flex items-center gap-1.5"
      >
        <MailPlus className="h-3.5 w-3.5" />
        Invite to portal
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-portal-invite-title"
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h3 id="customer-portal-invite-title" className="font-semibold text-slate-900">
                Invite customer to BuildTrack360
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                New customers receive a secure Supabase invitation email. An existing customer account in this company can be linked without changing its password.
              </p>
            </div>
            <div>
              <label htmlFor="customer-portal-invite-email" className="text-sm text-slate-700">
                Customer email
              </label>
              <input
                id="customer-portal-invite-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !email.trim()}
                className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
