import { queryOptions } from "@tanstack/react-query";
import { getBlogDraft, listBlogDrafts } from "@/serverFunctions/blogDrafts";

export const blogWriterQueryKey = (projectId: string) => [
  "blogWriter",
  projectId,
];

export function blogDraftsOptions(projectId: string) {
  return queryOptions({
    queryKey: [...blogWriterQueryKey(projectId), "list"],
    queryFn: () => listBlogDrafts({ data: { projectId } }),
  });
}

export function blogDraftOptions(projectId: string, id: string) {
  return queryOptions({
    queryKey: [...blogWriterQueryKey(projectId), "draft", id],
    queryFn: () => getBlogDraft({ data: { projectId, id } }),
  });
}

export type BlogDraft = Awaited<ReturnType<typeof getBlogDraft>>;
