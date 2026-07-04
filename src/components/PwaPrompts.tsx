import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import {
  initPwa,
  isAppInstalled,
  onInstallAvailableChange,
  onUpdateAvailable,
  promptInstall,
} from "@/lib/pwa";
import { useAuth } from "@/lib/auth";

const INSTALL_DISMISS_KEY = "pwa:install-dismissed-session";

export function PwaPrompts() {
  const { user } = useAuth();
  const [installReady, setInstallReady] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateReload, setUpdateReload] = useState<null | (() => void)>(null);

  useEffect(() => {
    initPwa();
    setInstalled(isAppInstalled());
    setInstallDismissed(typeof window !== "undefined" && sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1");
    const offInstall = onInstallAvailableChange((available) => {
      const appInstalled = isAppInstalled();
      setInstalled(appInstalled);
      setInstallReady(available && !appInstalled);
    });
    const offUpdate = onUpdateAvailable((reload) => {
      setUpdateReload(() => reload);
    });
    return () => {
      offInstall();
      offUpdate();
    };
  }, []);

  const dismissInstall = () => {
    sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setInstallDismissed(true);
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome !== "unavailable") setInstallReady(false);
  };

  const showSignedInInstallPrompt = Boolean(user) && !installed && !installDismissed && !updateReload;

  return (
    <>
      {updateReload && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border border-[#1E3A5F]/20 bg-white shadow-lg p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">Update available</div>
            <div className="text-xs text-slate-500 mt-0.5">
              A new version of BuildTrack360 is ready.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => updateReload()}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#1E3A5F] text-white hover:bg-[#162d4a]"
              >
                Reload now
              </button>
              <button
                onClick={() => setUpdateReload(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignedInInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-[55] max-w-sm rounded-lg border border-slate-200 bg-white shadow-lg p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center shrink-0">
            <Download className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">Install BuildTrack360</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Add to your device for faster access and a full-screen experience.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#1E3A5F] text-white hover:bg-[#162d4a]"
              >
                {installReady ? "Install" : "Install app"}
              </button>
              <button
                onClick={dismissInstall}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            aria-label="Dismiss"
            onClick={dismissInstall}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
