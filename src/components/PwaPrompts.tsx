import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { initPwa, onUpdateAvailable } from "@/lib/pwa";

export function PwaPrompts() {
  const [updateReload, setUpdateReload] = useState<null | (() => void)>(null);

  useEffect(() => {
    initPwa();
    const offUpdate = onUpdateAvailable((reload) => {
      setUpdateReload(() => reload);
    });
    return () => {
      offUpdate();
    };
  }, []);

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
    </>
  );
}
