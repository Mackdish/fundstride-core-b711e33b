// PWA service worker registration with strict guards for Lovable preview/dev.
// Also exposes the beforeinstallprompt event so UI can trigger the native install dialog.

import { Workbox } from "workbox-window";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();
const updateListeners = new Set<(reload: () => void) => void>();

function isPreviewOrDev(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

export function onInstallAvailableChange(cb: (available: boolean) => void) {
  installListeners.add(cb);
  cb(deferredPrompt !== null);
  return () => installListeners.delete(cb);
}

export function onUpdateAvailable(cb: (reload: () => void) => void) {
  updateListeners.add(cb);
  return () => updateListeners.delete(cb);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((cb) => cb(false));
  return outcome;
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function initPwa() {
  if (typeof window === "undefined") return;

  // Install prompt capture (works regardless of SW registration)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    installListeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((cb) => cb(false));
  });

  if (!("serviceWorker" in navigator)) return;

  if (isPreviewOrDev()) {
    // Clean up any previously registered app SW in preview/dev
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
        if (url.endsWith("/sw.js")) r.unregister();
      });
    });
    return;
  }

  const wb = new Workbox("/sw.js");

  const triggerUpdatePrompt = () => {
    const reload = () => {
      wb.addEventListener("controlling", () => window.location.reload());
      wb.messageSkipWaiting();
    };
    updateListeners.forEach((cb) => cb(reload));
  };

  wb.addEventListener("waiting", triggerUpdatePrompt);

  wb.register().catch(() => {
    /* ignore registration failures */
  });
}
