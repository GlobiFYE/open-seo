import { z } from "zod";

export const blogFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

export const blogImageSourceSchema = z.enum([
  "pexels",
  "unsplash",
  "pixabay",
  "product",
]);

export type BlogImageSource = z.infer<typeof blogImageSourceSchema>;

const optionalUrl = z.url().trim().max(2048).optional();

export const blogImageSuggestionSchema = z.object({
  placement: z.string().trim().max(200),
  alt: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  source: blogImageSourceSchema.optional(),
  sourceId: z.string().trim().max(200).optional(),
  url: optionalUrl,
  previewUrl: optionalUrl,
  pageUrl: optionalUrl,
  downloadLocation: optionalUrl,
  credit: z.string().trim().max(200).optional(),
  creditUrl: optionalUrl,
  productUrl: optionalUrl,
  productTitle: z.string().trim().max(300).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  inBody: z.boolean().optional(),
});

export type BlogImageSuggestion = z.infer<typeof blogImageSuggestionSchema>;

export const BLOG_IMAGE_LIMIT = 25;

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
  imageSuggestions: z
    .array(blogImageSuggestionSchema)
    .max(BLOG_IMAGE_LIMIT)
    .default([]),
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

export const downloadBlogImagesSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
  indexes: z.array(z.number().int().min(0)).max(BLOG_IMAGE_LIMIT).optional(),
});

export const updateBlogDraftMetaSchema = z.object({
  ...projectIdShape,
  id: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  metaTitle: z.string().trim().max(120),
  metaDescription: z.string().trim().max(320),
  slug: z.string().trim().max(120),
});
