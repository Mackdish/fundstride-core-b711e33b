import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

// Signs out any authenticated user after 5 minutes of no interaction.
const IDLE_MS = 5 * 60 * 1000;
const EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "visibilitychange"] as const;

export function InactivityGuard() {
  const { user, signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        toast.warning("Signed out due to 5 minutes of inactivity");
        await signOut();
      }, IDLE_MS);
    };

    EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [user, signOut]);

  return null;
}
