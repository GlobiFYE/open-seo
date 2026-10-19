import { createServerFn } from "@tanstack/react-start";
import { BlogDraftService } from "@/server/features/blog-writer/services/BlogDraftService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  getBlogDraftSchema,
  listBlogDraftsSchema,
  publishBlogDraftSchema,
  updateBlogDraftMetaSchema,
} from "@/types/schemas/blog-writer";

export const listBlogDrafts = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listBlogDraftsSchema)
  .handler(async ({ context }) =>
    BlogDraftService.listDrafts(context.projectId),
  );

export const getBlogDraft = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(getBlogDraftSchema)
  .handler(async ({ data, context }) =>
    BlogDraftService.getDraft(context.projectId, data.id),
  );

export const updateBlogDraftMeta = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateBlogDraftMetaSchema)
  .handler(async ({ data, context }) =>
    BlogDraftService.updateMeta(context.projectId, data.id, {
      title: data.title,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      slug: data.slug,
    }),
  );

export const publishBlogDraft = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(publishBlogDraftSchema)
  .handler(async ({ data, context }) =>
    BlogDraftService.markPublished(
      context.projectId,
      data.id,
      data.publishedUrl,
    ),
  );

export const deleteBlogDraft = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(getBlogDraftSchema)
  .handler(async ({ data, context }) =>
    BlogDraftService.deleteDraft(context.projectId, data.id),
  );
