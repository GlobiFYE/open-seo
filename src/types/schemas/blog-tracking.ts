import { z } from "zod";

export const BLOG_TRACKING_RANGES = [
  "last_28_days",
  "last_3_months",
  "last_6_months",
] as const;

export type BlogTrackingDateRange = (typeof BLOG_TRACKING_RANGES)[number];

export const BLOG_POST_STATUSES = [
  "new",
  "rising",
  "stable",
  "declining",
  "no_data",
] as const;

export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

const projectIdShape = { projectId: z.string().min(1) };

const blogUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`,
  )
  .pipe(z.url());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null));

export const blogTrackingReportSchema = z.object({
  ...projectIdShape,
  dateRange: z.enum(BLOG_TRACKING_RANGES).default("last_28_days"),
});

export const blogPostQueriesSchema = z.object({
  ...projectIdShape,
  url: z.string().trim().min(1).max(2048),
  dateRange: z.enum(BLOG_TRACKING_RANGES).default("last_28_days"),
});

export const addBlogPostsSchema = z.object({
  ...projectIdShape,
  posts: z
    .array(
      z.object({
        url: blogUrl,
        title: optionalText(300),
        targetKeyword: optionalText(200),
        publishedAt: optionalDate,
      }),
    )
    .min(1)
    .max(200),
});

export const updateBlogPostSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
  title: optionalText(300),
  targetKeyword: optionalText(200),
  publishedAt: optionalDate,
});

export const removeBlogPostsSchema = z.object({
  ...projectIdShape,
  ids: z.array(z.string().min(1)).min(1).max(200),
});
