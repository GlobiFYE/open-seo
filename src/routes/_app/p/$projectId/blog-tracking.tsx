import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { BlogTrackingPage } from "@/client/features/blog-tracking/BlogTrackingPage";
import { BLOG_TRACKING_RANGES } from "@/types/schemas/blog-tracking";

const searchSchema = z.object({
  range: z
    .enum(BLOG_TRACKING_RANGES)
    .default("last_28_days")
    .catch("last_28_days"),
});

export const Route = createFileRoute("/_app/p/$projectId/blog-tracking")({
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams({ range: "last_28_days" })],
  },
  component: BlogTrackingRoute,
});

function BlogTrackingRoute() {
  const { projectId } = Route.useParams();
  const { range } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <BlogTrackingPage
      projectId={projectId}
      dateRange={range}
      onDateRangeChange={(next) => {
        void navigate({ search: { range: next }, replace: true });
      }}
    />
  );
}
