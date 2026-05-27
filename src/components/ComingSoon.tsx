import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./EmptyState";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={<Construction className="h-6 w-6" />}
        title="Module in progress"
        message="This module is part of Phase 1 MVP and will be enabled in an upcoming iteration."
      />
    </>
  );
}
