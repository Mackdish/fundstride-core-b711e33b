import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";
import {
  isAppInstalled,
  onInstallAvailableChange,
  promptInstall,
} from "@/lib/pwa";

/**
 * In-app "Install app" button. Behavior:
 *  - Hidden if the app is already installed.
 *  - If the browser has fired `beforeinstallprompt`, clicking triggers the native prompt.
 *  - Otherwise (iOS Safari, unsupported browsers, or preview iframe), clicking shows
 *    guidance so the user knows how to install on their device.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [installed, setInstalled] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setInstalled(isAppInstalled());
    const off = onInstallAvailableChange((a) => setAvailable(a && !isAppInstalled()));
    return () => { off(); };
  }, []);

  if (installed) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center gap-2 h-10 px-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium ${className}`}
      >
        <Check className="h-4 w-4" /> App installed
      </button>
    );
  }

  const handleClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("Installing BuildTrack360…");
    else if (outcome === "dismissed") toast("Install cancelled");
    else {
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/.test(ua);
      const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
      if (isIOS || isSafari) {
        toast.info("On iOS: open in Safari, then tap Share → Add to Home Screen.", { duration: 8000 });
      } else {
        toast.info("Install isn't available here. Open the published site in Chrome/Edge, then use the install icon in the address bar.", { duration: 8000 });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] ${className}`}
    >
      <Download className="h-4 w-4" /> Install app
      {available && <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden />}
    </button>
  );
}
