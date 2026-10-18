import { queryOptions } from "@tanstack/react-query";
import {
  getBlogPostQueries,
  getBlogTrackingReport,
} from "@/serverFunctions/blogTracking";
import type { BlogTrackingDateRange } from "@/types/schemas/blog-tracking";

export const blogTrackingQueryKey = (projectId: string) => [
  "blogTracking",
  projectId,
];

export function blogTrackingReportOptions(
  projectId: string,
  dateRange: BlogTrackingDateRange,
) {
  return queryOptions({
    queryKey: [...blogTrackingQueryKey(projectId), "report", dateRange],
    queryFn: () => getBlogTrackingReport({ data: { projectId, dateRange } }),
  });
}

export function blogPostQueriesOptions(
  projectId: string,
  url: string,
  dateRange: BlogTrackingDateRange,
) {
  return queryOptions({
    queryKey: [...blogTrackingQueryKey(projectId), "queries", url, dateRange],
    queryFn: () => getBlogPostQueries({ data: { projectId, url, dateRange } }),
  });
}

export type BlogTrackingReport = Awaited<
  ReturnType<typeof getBlogTrackingReport>
>;
export type BlogPostRow = BlogTrackingReport["posts"][number];
export type BlogSuggestion = BlogTrackingReport["suggestions"][number];
