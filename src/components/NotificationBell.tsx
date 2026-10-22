import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["in-app-notifications", userId];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("in_app_notifications")
        .select("id,title,message,notification_type,project_id,progress_update_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const unreadCount = notifications.filter((notification: any) => !notification.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-2 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 text-white text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-900">
              Close
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">You’re all caught up.</p>
            ) : (
              notifications.map((notification: any) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read_at) markRead.mutate(notification.id);
                  }}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${notification.read_at ? "bg-white" : "bg-blue-50/50"}`}
                >
                  <span className="flex items-start gap-2">
                    {!notification.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{formatDate(notification.created_at)}</span>
                    </span>
                    {notification.read_at && <CheckCheck className="h-4 w-4 shrink-0 text-slate-400" />}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
