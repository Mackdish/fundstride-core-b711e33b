import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";

export const Route = createFileRoute("/projects/new")({
  component: () => <ProtectedRoute><NewProject /></ProtectedRoute>,
});

function NewProject() {
  return (
    <>
      <PageHeader title="New project" description="Register a project for credit appraisal — full onboarding form." />
      <ProjectForm />
    </>
  );
}
