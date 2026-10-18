import { createServerFn } from "@tanstack/react-start";
import { BlogTrackingService } from "@/server/features/blog-tracking/services/BlogTrackingService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  addBlogPostsSchema,
  blogPostQueriesSchema,
  blogTrackingReportSchema,
  removeBlogPostsSchema,
  updateBlogPostSchema,
} from "@/types/schemas/blog-tracking";

export const getBlogTrackingReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(blogTrackingReportSchema)
  .handler(async ({ data, context }) =>
    BlogTrackingService.getReport(context.projectId, data.dateRange),
  );

export const getBlogPostQueries = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(blogPostQueriesSchema)
  .handler(async ({ data, context }) =>
    BlogTrackingService.getPostQueries(
      context.projectId,
      data.url,
      data.dateRange,
    ),
  );

export const addBlogPosts = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(addBlogPostsSchema)
  .handler(async ({ data, context }) =>
    BlogTrackingService.addPosts(context.projectId, data.posts),
  );

export const updateBlogPost = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateBlogPostSchema)
  .handler(async ({ data, context }) =>
    BlogTrackingService.updatePost(context.projectId, data.id, {
      title: data.title,
      targetKeyword: data.targetKeyword,
      publishedAt: data.publishedAt,
    }),
  );

export const removeBlogPosts = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(removeBlogPostsSchema)
  .handler(async ({ data, context }) =>
    BlogTrackingService.removePosts(context.projectId, data.ids),
  );
