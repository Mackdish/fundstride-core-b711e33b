import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm, mapProjectRowToForm } from "@/components/ProjectForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/projects/$id/edit")({
  component: () => <ProtectedRoute roles={["executive", "super_admin"]}><EditProject /></ProtectedRoute>,
});

function EditProject() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["project-edit", id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("id", id).single()).data,
  });

  if (isLoading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!data) return <div className="text-sm text-red-600">Project not found.</div>;

  return (
    <>
      <PageHeader title="Edit project" description="Update the full project template. All fields are populated from existing data." />
      <ProjectForm projectId={id} initial={mapProjectRowToForm(data)} />
    </>
  );
}
