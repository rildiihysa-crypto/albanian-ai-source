import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/workspace";
import { AppBoundary } from "@/lib/error-component";

export const Route = createFileRoute("/app")({
  component: AppPage,
});

function AppPage() {
  return (
    <AppBoundary>
      <Workspace />
    </AppBoundary>
  );
}
