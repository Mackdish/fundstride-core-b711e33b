import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";
import {
  isAppInstalled,
  onInstallAvailableChange,
  promptInstall,
} from "@/lib/pwa";

/**
 * Installs BuildTrack360 as a PWA where the browser supports it.
 * A browser may withhold the native prompt in previews, embedded frames,
 * or before its installability checks have completed.
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
    if (outcome === "accepted") {
      toast.success("Installing BuildTrack360…");
      return;
    }
    if (outcome === "dismissed") {
      toast("Install cancelled");
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const inFrame = window.self !== window.top;

    if (inFrame) {
      toast.info(
        "You're viewing an embedded preview. Open https://buildtrack360.co.ke directly in your browser to install BuildTrack360.",
        { duration: 10000 }
      );
    } else if (isIOS || isSafari) {
      toast.info(
        "To install: open this site in Safari, tap Share, then choose Add to Home Screen.",
        { duration: 10000 }
      );
    } else if (isAndroid) {
      toast.info(
        "In Chrome, tap ⋮ and choose Install app or Add to Home screen. If it is missing, refresh the published site and try again.",
        { duration: 10000 }
      );
    } else {
      toast.info(
        "Open the published site directly in Chrome or Edge. Use the Install icon in the address bar, or open the browser menu and choose Install BuildTrack360. If that option is missing, refresh the site and try again.",
        { duration: 10000 }
      );
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
