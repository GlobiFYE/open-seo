import { z } from "zod";

export const blogFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

export const blogImageSuggestionSchema = z.object({
  placement: z.string().trim().max(200),
  alt: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
});

export const blogInternalLinkSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  anchor: z.string().trim().min(1).max(200),
});

export const blogDraftContentSchema = z.object({
  targetKeyword: z.string().trim().min(1).max(200),
  secondaryKeywords: z
    .array(z.string().trim().min(1).max(200))
    .max(30)
    .default([]),
  languageCode: z.string().trim().min(2).max(10).optional(),
  title: z.string().trim().min(1).max(300),
  metaTitle: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(600).optional(),
  contentHtml: z.string().min(1).max(200_000),
  faqs: z.array(blogFaqSchema).max(15).default([]),
  imageSuggestions: z.array(blogImageSuggestionSchema).max(15).default([]),
  internalLinks: z.array(blogInternalLinkSchema).max(30).default([]),
  researchNotes: z.string().trim().max(5000).optional(),
});

export type BlogDraftContent = z.infer<typeof blogDraftContentSchema>;

const projectIdShape = { projectId: z.string().min(1) };

export const listBlogDraftsSchema = z.object(projectIdShape);

export const getBlogDraftSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
});

export const publishBlogDraftSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
  publishedUrl: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .transform((value) =>
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    )
    .pipe(z.url()),
});

export const updateBlogDraftMetaSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  metaTitle: z.string().trim().max(120),
  metaDescription: z.string().trim().max(320),
  slug: z.string().trim().max(120),
});
