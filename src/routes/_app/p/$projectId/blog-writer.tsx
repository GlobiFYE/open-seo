import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BlogDraftDetail } from "@/client/features/blog-writer/BlogDraftDetail";
import { BlogWriterPage } from "@/client/features/blog-writer/BlogWriterPage";

const searchSchema = z.object({
  draft: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/p/$projectId/blog-writer")({
  validateSearch: searchSchema,
  component: BlogWriterRoute,
});

function BlogWriterRoute() {
  const { projectId } = Route.useParams();
  const { draft } = Route.useSearch();
  return draft ? (
    <BlogDraftDetail key={draft} projectId={projectId} draftId={draft} />
  ) : (
    <BlogWriterPage projectId={projectId} />
  );
}
