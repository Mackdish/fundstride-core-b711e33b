import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { attachProgressPhoto, deleteProgressPhoto } from "@/lib/project-progress.functions";

type ProgressPhotoGalleryProps = {
  projectId: string;
  updateId: string;
  tenantId: string;
  editable?: boolean;
};

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function ProgressPhotoGallery({
  projectId,
  updateId,
  tenantId,
  editable = false,
}: ProgressPhotoGalleryProps) {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const queryKey = ["progress-photos", updateId];

  const { data: photos = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error: queryError } = await (supabase as any)
        .from("project_progress_photos")
        .select("id,project_id,progress_update_id,tenant_id,storage_path,caption,created_at")
        .eq("progress_update_id", updateId)
        .order("created_at", { ascending: true });
      if (queryError) throw queryError;

      return Promise.all((data ?? []).map(async (photo: any) => {
        const { data: signed, error: signedError } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(photo.storage_path, 10 * 60);
        return { ...photo, signedUrl: signedError ? null : signed?.signedUrl ?? null };
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deleteProgressPhoto({ data: { photo_id: photoId } }),
    onSuccess: async () => {
      toast.success("Photo deleted");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Unable to delete photo"),
  });

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    if (!tenantId) {
      toast.error("This project has no tenant assigned. Contact an administrator.");
      return;
    }

    const invalid = files.find((file) => !EXTENSION_BY_TYPE[file.type] || file.size > MAX_PHOTO_BYTES);
    if (invalid) {
      toast.error("Use JPEG, PNG, or WebP images up to 10 MB each.");
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        const extension = EXTENSION_BY_TYPE[file.type];
        const storagePath = `${tenantId}/${projectId}/${updateId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("progress-photos")
          .upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        try {
          await attachProgressPhoto({
            data: {
              project_id: projectId,
              update_id: updateId,
              storage_path: storagePath,
              caption: caption.trim(),
            },
          });
          uploadedCount += 1;
        } catch (error: any) {
          await supabase.storage.from("progress-photos").remove([storagePath]);
          failures.push(`${file.name}: ${error?.message ?? "Could not attach photo"}`);
        }
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded`);
        setCaption("");
        await queryClient.invalidateQueries({ queryKey });
      }
      if (failures.length) toast.error(failures.slice(0, 2).join(" · "));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {editable && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
          <label className="block text-xs font-medium text-slate-600" htmlFor={`photo-caption-${updateId}`}>
            Caption (optional)
          </label>
          <input
            id={`photo-caption-${updateId}`}
            value={caption}
            maxLength={500}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Describe the site photos"
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          />
          <label className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm ${uploading ? "opacity-50" : "hover:bg-slate-100"}`}>
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading photos…" : "Add photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(event) => {
                void uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <p className="text-xs text-slate-500">Multiple photos supported. JPEG, PNG or WebP; maximum 10 MB per image.</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-slate-500">Loading photos…</p>
      ) : error ? (
        <p className="text-xs text-red-600">Photos could not be loaded. Check access and try again.</p>
      ) : photos.length === 0 ? (
        editable ? <p className="text-xs text-slate-500">No photos attached to this update yet.</p> : null
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo: any) => (
            <figure key={photo.id} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {photo.signedUrl ? (
                <a href={photo.signedUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={photo.signedUrl} alt={photo.caption || "Project progress photo"} loading="lazy" className="h-32 w-full object-cover" />
                </a>
              ) : (
                <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-500">Photo unavailable</div>
              )}
              {(photo.caption || editable) && (
                <figcaption className="p-2 flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-600 break-words">{photo.caption || "Site photo"}</span>
                  {editable && (
                    <button
                      type="button"
                      title="Delete photo"
                      aria-label="Delete photo"
                      onClick={() => {
                        if (confirm("Delete this progress photo?")) deleteMutation.mutate(photo.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
